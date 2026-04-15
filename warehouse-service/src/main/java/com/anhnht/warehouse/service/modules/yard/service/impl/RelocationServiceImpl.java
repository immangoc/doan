package com.anhnht.warehouse.service.modules.yard.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.entity.ContainerStatus;
import com.anhnht.warehouse.service.modules.container.entity.ContainerStatusHistory;
import com.anhnht.warehouse.service.modules.container.repository.ContainerStatusHistoryRepository;
import com.anhnht.warehouse.service.modules.container.repository.ContainerStatusRepository;
import com.anhnht.warehouse.service.modules.yard.dto.request.RelocationRequest;
import com.anhnht.warehouse.service.modules.yard.dto.request.SwapRequest;
import com.anhnht.warehouse.service.modules.yard.dto.response.RelocationResponse;
import com.anhnht.warehouse.service.modules.yard.dto.response.SwapResponse;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import com.anhnht.warehouse.service.modules.yard.service.RelocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RelocationServiceImpl implements RelocationService {

    private final ContainerPositionRepository positionRepository;
    private final SlotRepository              slotRepository;
    private final ContainerStatusRepository   statusRepository;
    private final ContainerStatusHistoryRepository historyRepository;

    @Override
    @Transactional
    public RelocationResponse relocate(RelocationRequest request) {
        String  containerId    = request.getContainerId();
        Integer targetSlotId   = request.getTargetSlotId();
        Integer targetTier     = request.getTargetTier();

        // 1. Confirm current position exists
        ContainerPosition position = positionRepository.findByContainerContainerId(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "No active position found for container: " + containerId));

        Integer fromSlotId = position.getSlot().getSlotId();

        // No-op guard
        if (fromSlotId.equals(targetSlotId) && position.getTier().equals(targetTier)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Container is already at the specified slot and tier");
        }

        // 2. Validate target slot exists
        Slot targetSlot = slotRepository.findById(targetSlotId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SLOT_NOT_FOUND,
                        "Slot not found: " + targetSlotId));

        if (Boolean.TRUE.equals(targetSlot.getLocked())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Slot is locked: " + targetSlotId);
        }

        // 3. Validate tier within slot max
        if (targetTier > targetSlot.getMaxTier()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Tier " + targetTier + " exceeds max tier " + targetSlot.getMaxTier()
                    + " for slot " + targetSlotId);
        }

        final boolean is40ft = is40ft(position.getContainer());
        Slot placeAnchor = targetSlot;
        Slot placePaired = null;
        if (is40ft) {
            // Area rule: 40ft only allowed in dedicated 40ft half (bayNo >= 5, 1-based).
            if (targetSlot.getBayNo() <= 4) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "40ft container must be relocated to the 40ft area (bayNo >= 5)");
            }

            int blockId = targetSlot.getBlock().getBlockId();
            int rowNo = targetSlot.getRowNo();
            int bayNo = targetSlot.getBayNo();
            // Normalize to anchor row (odd rowNo, 1-based)
            if (rowNo % 2 == 0) {
                final int anchorRow = rowNo - 1;
                placeAnchor = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(blockId, anchorRow, bayNo)
                        .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                                "40ft container must be relocated to an anchor row (missing row " + anchorRow + ")"));
                rowNo = anchorRow;
            }

            final int pairedRow = rowNo + 1;
            placePaired = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(blockId, pairedRow, bayNo)
                    .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                            "40ft container requires 2 adjacent rows but row " + pairedRow + " is missing"));

            if (Boolean.TRUE.equals(placeAnchor.getLocked()) || Boolean.TRUE.equals(placePaired.getLocked())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Target footprint contains locked slot(s) for 40ft container");
            }

            if (isCellOccupied(placeAnchor, targetTier) || isCellOccupied(placePaired, targetTier)) {
                throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                        "Tier " + targetTier + " footprint is occupied for 40ft container at slot " + placeAnchor.getSlotId());
            }

            if (targetTier > 1 && (!isCellOccupied(placeAnchor, targetTier - 1) || !isCellOccupied(placePaired, targetTier - 1))) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "40ft container requires support below on both rows (tier " + (targetTier - 1) + ")");
            }
        } else {
            if (isCellOccupied(targetSlot, targetTier)) {
                throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                        "Tier " + targetTier + " in slot " + targetSlotId + " is already occupied");
            }
            if (targetTier > 1 && !isCellOccupied(targetSlot, targetTier - 1)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "20ft container requires support below at tier " + (targetTier - 1));
            }
        }

        // 5. Move the position
        position.setSlot(is40ft ? placeAnchor : targetSlot);
        position.setTier(targetTier);
        ContainerPosition saved = positionRepository.save(position);

        // 6. Auto-sync container status by target yard type:
        //    - move into damaged yard  → DAMAGED
        //    - move into any other yard → IN_YARD
        Container container = saved.getContainer();
        if (container != null) {
            String yardTypeName = null;
            String yardName = null;
            try {
                var block = targetSlot.getBlock();
                var zone  = block != null ? block.getZone() : null;
                var yard  = zone  != null ? zone.getYard() : null;
                yardName = yard != null ? yard.getYardName() : null;
                yardTypeName = (yard != null && yard.getYardType() != null) ? yard.getYardType().getYardTypeName() : null;
            } catch (Exception ignored) {}

            boolean isDamagedYard = (yardTypeName != null && yardTypeName.equalsIgnoreCase("damaged"))
                    || (yardName != null && yardName.toLowerCase().contains("hỏng"));

            String desiredStatus = isDamagedYard ? "DAMAGED" : "IN_YARD";
            String currentStatus = container.getStatus() != null ? container.getStatus().getStatusName() : null;

            if (currentStatus == null || !currentStatus.equalsIgnoreCase(desiredStatus)) {
                ContainerStatus newStatus = statusRepository.findByStatusNameIgnoreCase(desiredStatus)
                        .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                                "Container status not found: " + desiredStatus));
                container.setStatus(newStatus);

                ContainerStatusHistory h = new ContainerStatusHistory();
                h.setContainer(container);
                h.setStatus(newStatus);
                h.setDescription("Auto status update due to relocation");
                historyRepository.save(h);
            }
        }

        return RelocationResponse.builder()
                .containerId(containerId)
                .fromSlotId(fromSlotId)
                .toSlotId(targetSlotId)
                .tier(targetTier)
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public SwapResponse swap(SwapRequest request) {
        String idA = request.getContainerIdA();
        String idB = request.getContainerIdB();

        // Guard: containers must be different
        if (idA.equalsIgnoreCase(idB)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Cannot swap a container with itself");
        }

        // Validate both containers have active positions
        ContainerPosition posA = positionRepository.findByContainerContainerId(idA)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "No active position found for container: " + idA));

        ContainerPosition posB = positionRepository.findByContainerContainerId(idB)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "No active position found for container: " + idB));

        // Capture A's current slot/tier before overwriting
        Slot    slotA = posA.getSlot();
        Integer tierA = posA.getTier();

        // Swap: A gets B's position, B gets A's position
        posA.setSlot(posB.getSlot());
        posA.setTier(posB.getTier());
        posB.setSlot(slotA);
        posB.setTier(tierA);

        positionRepository.save(posA);
        positionRepository.save(posB);

        // Auto-sync statuses after swap (same rule as relocate)
        syncStatusBySlot(posA.getContainer(), posA.getSlot());
        syncStatusBySlot(posB.getContainer(), posB.getSlot());

        return SwapResponse.builder()
                .containerIdA(idA)
                .containerANewSlotId(posA.getSlot().getSlotId())
                .containerANewTier(posA.getTier())
                .containerIdB(idB)
                .containerBNewSlotId(posB.getSlot().getSlotId())
                .containerBNewTier(posB.getTier())
                .build();
    }

    private void syncStatusBySlot(Container container, Slot slot) {
        if (container == null || slot == null) return;
        String yardTypeName = null;
        String yardName = null;
        try {
            var block = slot.getBlock();
            var zone  = block != null ? block.getZone() : null;
            var yard  = zone  != null ? zone.getYard() : null;
            yardName = yard != null ? yard.getYardName() : null;
            yardTypeName = (yard != null && yard.getYardType() != null) ? yard.getYardType().getYardTypeName() : null;
        } catch (Exception ignored) {}

        boolean isDamagedYard = (yardTypeName != null && yardTypeName.equalsIgnoreCase("damaged"))
                || (yardName != null && yardName.toLowerCase().contains("hỏng"));

        String desiredStatus = isDamagedYard ? "DAMAGED" : "IN_YARD";
        String currentStatus = container.getStatus() != null ? container.getStatus().getStatusName() : null;

        if (currentStatus == null || !currentStatus.equalsIgnoreCase(desiredStatus)) {
            ContainerStatus newStatus = statusRepository.findByStatusNameIgnoreCase(desiredStatus)
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                            "Container status not found: " + desiredStatus));
            container.setStatus(newStatus);

            ContainerStatusHistory h = new ContainerStatusHistory();
            h.setContainer(container);
            h.setStatus(newStatus);
            h.setDescription("Auto status update due to relocation");
            historyRepository.save(h);
        }
    }

    private boolean is40ft(Container c) {
        try {
            String name = c != null && c.getContainerType() != null ? c.getContainerType().getContainerTypeName() : null;
            return name != null && name.toUpperCase().contains("40");
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isCellOccupied(Slot slotCell, int tier) {
        if (slotCell == null) return false;
        if (positionRepository.countBySlotAndTier(slotCell.getSlotId(), tier) > 0) return true;
        Integer blockId = slotCell.getBlock() != null ? slotCell.getBlock().getBlockId() : null;
        if (blockId == null) return false;
        int rowNo = slotCell.getRowNo();
        int bayNo = slotCell.getBayNo();
        Integer pairedRow = (rowNo % 2 == 0) ? (rowNo - 1) : (rowNo + 1);
        if (pairedRow <= 0) return false;
        Slot paired = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(blockId, pairedRow, bayNo).orElse(null);
        if (paired == null) return false;
        return positionRepository.findBySlotAndTierWithContainer(paired.getSlotId(), tier)
                .map(ContainerPosition::getContainer)
                .map(this::is40ft)
                .orElse(false);
    }
}

package com.anhnht.warehouse.service.modules.gatein.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.gatein.dto.request.ContainerPositionRequest;
import com.anhnht.warehouse.service.modules.gatein.dto.request.GateInRequest;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.entity.GateInReceipt;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.GateInReceiptRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.gatein.service.GateInService;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.vessel.entity.Voyage;
import com.anhnht.warehouse.service.modules.vessel.repository.VoyageRepository;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.entity.Yard;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import com.anhnht.warehouse.service.modules.yard.repository.YardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GateInServiceImpl implements GateInService {

    private static final String STATUS_GATE_IN = "GATE_IN";
    private static final String STATUS_IN_YARD  = "IN_YARD";

    private final GateInReceiptRepository    receiptRepository;
    private final YardStorageRepository      storageRepository;
    private final ContainerPositionRepository positionRepository;
    private final ContainerService           containerService;
    private final VoyageRepository           voyageRepository;
    private final YardRepository             yardRepository;
    private final SlotRepository             slotRepository;
    private final UserRepository             userRepository;

    @Override
    @Transactional
    public GateInReceipt processGateIn(Integer operatorId, GateInRequest request) {
        String containerId = request.getContainerId();

        // Prevent duplicate gate-in
        if (receiptRepository.existsByContainerContainerId(containerId)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Container already has a gate-in record: " + containerId);
        }

        Container container = containerService.findById(containerId);

        GateInReceipt receipt = new GateInReceipt();
        receipt.setContainer(container);
        receipt.setNote(request.getNote());

        if (request.getVoyageId() != null) {
            Voyage voyage = voyageRepository.findById(request.getVoyageId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                            "Voyage not found: " + request.getVoyageId()));
            receipt.setVoyage(voyage);
        }

        if (operatorId != null) {
            userRepository.findById(operatorId).ifPresent(receipt::setCreatedBy);
        }

        GateInReceipt saved = receiptRepository.save(receipt);

        // Update container status → GATE_IN
        containerService.changeStatus(containerId, STATUS_GATE_IN, "Container passed gate-in");

        // Create yard storage record
        Yard yard = yardRepository.findById(request.getYardId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Yard not found: " + request.getYardId()));

        YardStorage storage = new YardStorage();
        storage.setContainer(container);
        storage.setYard(yard);
        storage.setNote(request.getNote());
        storageRepository.save(storage);

        return saved;
    }

    @Override
    public Page<GateInReceipt> findAll(Pageable pageable) {
        return receiptRepository.findAllPaged(pageable);
    }

    @Override
    public GateInReceipt findById(Integer gateInId) {
        return receiptRepository.findByIdWithDetails(gateInId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Gate-in receipt not found: " + gateInId));
    }

    @Override
    @Transactional
    public ContainerPosition assignPosition(String containerId, ContainerPositionRequest request) {
        Container container = containerService.findById(containerId);

        Slot slot = slotRepository.findByIdWithDetails(request.getSlotId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SLOT_NOT_FOUND,
                        "Slot not found: " + request.getSlotId()));

        if (Boolean.TRUE.equals(slot.getLocked())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Slot is locked: " + slot.getSlotId());
        }

        final int tier = request.getTier();
        final boolean is40ft = is40ft(container);

        // Area rule (UI/UX consistency with 2D/3D):
        // - 40ft must be placed in the dedicated 40ft half (bayNo >= 5, 1-based).
        // - 20ft remains unrestricted by this rule (can be in any bay), but still must satisfy footprint/support rules.
        if (is40ft && slot.getBayNo() <= 4) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "40ft container must be placed in the 40ft area (bayNo >= 5)");
        }

        // Footprint rules:
        // - 20ft occupies 1 cell (slotId at row/bay).
        // - 40ft occupies 2 adjacent 20ft cells in the ROW direction (row + (row+1)) at the same bay,
        //   but is stored as ONE position on the ANCHOR row (rowNo odd, 1-based).
        // Stacking support:
        // - tier > 1 requires support below:
        //   - 20ft: the same cell at tier-1 must be occupied (including covered-by-40ft).
        //   - 40ft: BOTH anchor and paired ROW cells at tier-1 must be occupied.
        Slot placeSlotAnchor = slot;
        Slot placeSlotPaired = null;

        if (is40ft) {
            // Normalize to anchor row (odd rowNo, 1-based)
            int blockId = slot.getBlock().getBlockId();
            int rowNo = slot.getRowNo();
            int bayNo = slot.getBayNo();
            if (rowNo % 2 == 0) {
                final int anchorRow = rowNo - 1;
                placeSlotAnchor = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(blockId, anchorRow, bayNo)
                        .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                                "40ft container must be placed on an anchor row (missing row " + anchorRow + ")"));
                rowNo = anchorRow;
            }

            // Paired row must exist (rowNo + 1) at same bay
            final int pairedRow = rowNo + 1;
            placeSlotPaired = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(blockId, pairedRow, bayNo)
                    .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                            "40ft container requires 2 adjacent rows but row " + pairedRow + " is missing"));

            if (Boolean.TRUE.equals(placeSlotAnchor.getLocked()) || Boolean.TRUE.equals(placeSlotPaired.getLocked())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Target footprint contains locked slot(s) for 40ft container");
            }

            // Validate target tier cells not already occupied (either directly or covered by neighbor 40ft)
            if (isCellOccupied(placeSlotAnchor, tier) || isCellOccupied(placeSlotPaired, tier)) {
                throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                        "Tier " + tier + " footprint is occupied for 40ft container at slot " + placeSlotAnchor.getSlotId());
            }

            // Support below for stacking
            if (tier > 1 && (!isCellOccupied(placeSlotAnchor, tier - 1) || !isCellOccupied(placeSlotPaired, tier - 1))) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "40ft container requires support below on both rows (tier " + (tier - 1) + ")");
            }
        } else {
            // Validate tier cell not already occupied (including covered-by-40ft from left neighbor)
            if (isCellOccupied(slot, tier)) {
                throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                        "Tier " + tier + " in slot " + slot.getSlotId() + " is occupied");
            }

            // Support below for stacking (allows 20ft on top of 40ft via covered-by-40ft check)
            if (tier > 1 && !isCellOccupied(slot, tier - 1)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "20ft container requires support below at tier " + (tier - 1));
            }
        }

        // Validate tier within slot max
        if (tier > slot.getMaxTier()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Tier " + tier + " exceeds max tier " + slot.getMaxTier());
        }

        ContainerPosition position = positionRepository.findByContainerContainerId(containerId)
                .orElseGet(ContainerPosition::new);
        position.setContainer(container);
        position.setSlot(is40ft ? placeSlotAnchor : slot);
        position.setTier(tier);
        ContainerPosition saved = positionRepository.save(position);

        // Update container status → IN_YARD
        containerService.changeStatus(containerId, STATUS_IN_YARD, "Container positioned in slot");

        return saved;
    }

    private boolean is40ft(Container c) {
        try {
            String name = c.getContainerType() != null ? c.getContainerType().getContainerTypeName() : null;
            return name != null && name.toUpperCase().contains("40");
        } catch (Exception ignored) {
            return false;
        }
    }

    /**
     * True if a 20ft cell at (slot,row,bay) is occupied at the given tier.
     * A cell can be occupied either by:
     * - A container_position directly on that slot/tier (20ft OR 40ft-left-cell), OR
     * - A 40ft container stored on the left adjacent cell that covers this right cell.
     */
    private boolean isCellOccupied(Slot slotCell, int tier) {
        if (slotCell == null) return false;
        // Direct occupancy
        if (positionRepository.countBySlotAndTier(slotCell.getSlotId(), tier) > 0) return true;

        // Covered-by-40ft from paired row (row-pair footprint)
        Integer blockId = slotCell.getBlock() != null ? slotCell.getBlock().getBlockId() : null;
        if (blockId == null) return false;
        int rowNo = slotCell.getRowNo();
        int bayNo = slotCell.getBayNo();

        // If this row is the paired (even) row, the anchor is row-1; otherwise anchor is row+1 (paired cell).
        Integer pairedRow = (rowNo % 2 == 0) ? (rowNo - 1) : (rowNo + 1);
        if (pairedRow <= 0) return false;

        Slot anchor = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(blockId, pairedRow, bayNo).orElse(null);
        if (anchor == null) return false;

        return positionRepository.findBySlotAndTierWithContainer(anchor.getSlotId(), tier)
                .map(ContainerPosition::getContainer)
                .map(this::is40ft)
                .orElse(false);
    }

    @Override
    public ContainerPosition getPosition(String containerId) {
        return positionRepository.findByContainerContainerId(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "No position found for container: " + containerId));
    }

    @Override
    public List<YardStorage> getStorageHistory(String containerId) {
        containerService.findById(containerId); // validate existence
        return storageRepository.findByContainerIdOrdered(containerId);
    }
}

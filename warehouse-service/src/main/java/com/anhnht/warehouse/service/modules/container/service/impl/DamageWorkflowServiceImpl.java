package com.anhnht.warehouse.service.modules.container.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.repository.ContainerRepository;
import com.anhnht.warehouse.service.modules.container.service.DamageWorkflowService;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.yard.dto.request.RelocationRequest;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import com.anhnht.warehouse.service.modules.yard.service.RelocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DamageWorkflowServiceImpl implements DamageWorkflowService {

    private final ContainerRepository         containerRepository;
    private final ContainerPositionRepository positionRepository;
    private final YardStorageRepository       storageRepository;
    private final SlotRepository              slotRepository;
    private final RelocationService           relocationService;

    @Override
    @Transactional
    public Container moveToDamagedYard(String containerId) {
        // Ensure container exists
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Container not found: " + containerId));

        // Must have an active position to relocate
        ContainerPosition current = positionRepository.findByContainerContainerId(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "No active position found for container: " + containerId));

        // Pick first suitable damaged-yard slot at tier 1
        Slot target = findFirstFreeDamagedSlotTier1(containerId, current);

        RelocationRequest req = new RelocationRequest();
        req.setContainerId(containerId);
        req.setTargetSlotId(target.getSlotId());
        req.setTargetTier(1);
        relocationService.relocate(req);

        // Update active yard storage record to point to the damaged yard (for tracking & UI)
        storageRepository.findActiveByContainerId(containerId).ifPresent(active -> {
            try {
                var yard = target.getBlock().getZone().getYard();
                if (yard != null) {
                    active.setYard(yard);
                    storageRepository.save(active);
                }
            } catch (Exception ignored) {}
        });

        // Mark repairStatus=REPAIRING (keep status as DAMAGED; relocation auto-sync already does that)
        // container.setRepairStatus("REPAIRING"); // TODO: repairStatus does not exist in Container entity
        containerRepository.save(container);

        return containerRepository.findByIdWithDetails(containerId).orElse(container);
    }

    @Override
    @Transactional
    public void setExpectedExitDate(String containerId, LocalDate expectedExitDate) {
        if (expectedExitDate == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "expectedExitDate is required");
        }
        // Validate container exists
        containerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Container not found: " + containerId));

        YardStorage active = storageRepository.findActiveByContainerId(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "No active storage record found for container: " + containerId));

        active.setStorageEndDate(expectedExitDate);
        storageRepository.save(active);
    }

    private Slot findFirstFreeDamagedSlotTier1(String containerId, ContainerPosition currentPosition) {
        List<Slot> damagedSlots = slotRepository.findByYardTypeName("damaged");
        if (damagedSlots.isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.NOT_FOUND, "No slots found for damaged yard");
        }

        // Determine 40ft footprint by looking at current position's container type (loaded in entity graph)
        boolean is40ft = false;
        try {
            String type = currentPosition.getContainer() != null && currentPosition.getContainer().getContainerType() != null
                    ? currentPosition.getContainer().getContainerType().getContainerTypeName()
                    : null;
            is40ft = type != null && type.toUpperCase().contains("40");
        } catch (Exception ignored) {}

        for (Slot s : damagedSlots) {
            // For 40ft: must be in 40ft area (bayNo >= 5) and anchor row (odd)
            if (is40ft) {
                if (s.getBayNo() <= 4) continue;
                if (s.getRowNo() % 2 == 0) continue;
            }

            if (positionRepository.countBySlotAndTier(s.getSlotId(), 1) > 0) continue;

            if (is40ft) {
                // paired row must exist in same block/bay
                Slot paired = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(
                        s.getBlock().getBlockId(), s.getRowNo() + 1, s.getBayNo()).orElse(null);
                if (paired == null) continue;
                if (positionRepository.countBySlotAndTier(paired.getSlotId(), 1) > 0) continue;
            }

            return s;
        }

        throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                "No free tier-1 slot available in damaged yard for container: " + containerId);
    }
}


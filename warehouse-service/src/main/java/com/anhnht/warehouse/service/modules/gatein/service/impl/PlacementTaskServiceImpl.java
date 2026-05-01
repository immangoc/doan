package com.anhnht.warehouse.service.modules.gatein.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.alert.entity.Notification;
import com.anhnht.warehouse.service.modules.alert.repository.NotificationRepository;
import com.anhnht.warehouse.service.modules.booking.service.OrderService;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.gatein.dto.request.ContainerPositionRequest;
import com.anhnht.warehouse.service.modules.gatein.dto.response.PlacementTaskResponse;
import com.anhnht.warehouse.service.modules.gatein.entity.PlacementTask;
import com.anhnht.warehouse.service.modules.gatein.repository.PlacementTaskRepository;
import com.anhnht.warehouse.service.modules.gatein.service.GateInService;
import com.anhnht.warehouse.service.modules.gatein.service.PlacementTaskService;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlacementTaskServiceImpl implements PlacementTaskService {

    private final PlacementTaskRepository placementTaskRepository;
    private final ContainerService containerService;
    private final SlotRepository slotRepository;
    private final GateInService gateInService;
    private final NotificationRepository notificationRepository;
    private final OrderService orderService;

    @Override
    @Transactional
    public PlacementTaskResponse createPlacementTask(String containerId, ContainerPositionRequest request) {
        Container container = containerService.findById(containerId);

        Slot slot = slotRepository.findByIdWithDetails(request.getSlotId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SLOT_NOT_FOUND,
                        "Slot not found: " + request.getSlotId()));

        // Reject locked slots
        if (Boolean.TRUE.equals(slot.getIsLocked())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Vị trí này đã bị khóa, không thể nhập container" +
                    (slot.getLockReason() != null ? ": " + slot.getLockReason() : ""));
        }

        // Reject slots in locked zones
        if (slot.getBlock() != null && slot.getBlock().getZone() != null
                && Boolean.TRUE.equals(slot.getBlock().getZone().getIsLocked())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Khu vực " + slot.getBlock().getZone().getZoneName() + " đã bị khóa, không thể nhập container");
        }

        // Disable existing pending tasks for this container
        List<PlacementTask> existing = placementTaskRepository.findByContainerContainerIdAndStatus(containerId, "PENDING");
        existing.forEach(t -> t.setStatus("CANCELLED"));
        placementTaskRepository.saveAll(existing);

        PlacementTask task = new PlacementTask();
        task.setContainer(container);
        task.setSlot(slot);
        task.setTier(request.getTier());
        task.setStatus("PENDING");
        
        PlacementTask saved = placementTaskRepository.save(task);

        // Notify operator / yard staff (optional)
        Notification notif = new Notification();
        notif.setTitle("Lệnh xếp chỗ mới");
        notif.setDescription("Container " + containerId + " có lệnh xếp vào " + slot.getBlock().getZone().getZoneName() + " - " + slot.getBlock().getBlockName() + " - Tầng " + request.getTier());
        notificationRepository.save(notif);

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlacementTaskResponse> getPendingTasks() {
        return placementTaskRepository.findByStatusOrderByCreatedAtDesc("PENDING")
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void confirmPlacementTask(Integer taskId) {
        PlacementTask task = placementTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Task not found: " + taskId));

        if (!"PENDING".equals(task.getStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Task is not pending");
        }

        ContainerPositionRequest req = new ContainerPositionRequest();
        req.setSlotId(task.getSlot().getSlotId());
        req.setTier(task.getTier());

        // Call assignPosition which updates status to IN_YARD and STORED
        gateInService.assignPosition(task.getContainer().getContainerId(), req);

        task.setStatus("COMPLETED");
        placementTaskRepository.save(task);

        // Notify operator
        Notification notif = new Notification();
        notif.setTitle("Đã xác nhận xếp chỗ");
        notif.setDescription("Nhân viên kho đã xếp container " + task.getContainer().getContainerId() + " vào vị trí thành công.");
        notificationRepository.save(notif);
    }

    private PlacementTaskResponse mapToResponse(PlacementTask task) {
        PlacementTaskResponse res = new PlacementTaskResponse();
        res.setTaskId(task.getTaskId());
        res.setContainerId(task.getContainer().getContainerId());
        res.setSlotId(task.getSlot().getSlotId());
        res.setSlotName("R" + task.getSlot().getRowNo() + "C" + task.getSlot().getBayNo());
        res.setTier(task.getTier());
        res.setStatus(task.getStatus());
        
        if (task.getSlot().getBlock() != null && task.getSlot().getBlock().getZone() != null) {
            var zone = task.getSlot().getBlock().getZone();
            res.setZoneName(zone.getZoneName());
            res.setBlockName(task.getSlot().getBlock().getBlockName());
            res.setYardName(zone.getYard().getYardName());
        }
        res.setCargoType(task.getContainer().getCargoType() != null ? task.getContainer().getCargoType().getCargoTypeName() : null);
        res.setContainerType(task.getContainer().getContainerType() != null ? task.getContainer().getContainerType().getContainerTypeName() : null);
        res.setGrossWeight(task.getContainer().getGrossWeight() != null ? task.getContainer().getGrossWeight().doubleValue() : 0.0);
        res.setCreatedAt(task.getCreatedAt());
        return res;
    }
}

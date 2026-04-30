package com.anhnht.warehouse.service.modules.gatein.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.booking.service.OrderService;
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
    private final OrderService               orderService;
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

        // Enforce business rule: container must belong to an approved order
        var linkedOrder = orderService.findOrderByContainerId(containerId);
        if (linkedOrder == null) {
            throw new BusinessException(ErrorCode.BOOKING_NOT_FOUND,
                    "Container " + containerId + " chưa có đơn hàng. Khách hàng phải tạo đơn hàng và được duyệt trước khi nhập kho.");
        }
        var orderStatusName = linkedOrder.getStatus().getStatusName();
        var validImportStatuses = List.of("APPROVED", "WAITING_CHECKIN", "LATE_CHECKIN", "READY_FOR_IMPORT", "IMPORTED", "STORED");
        if (!validImportStatuses.contains(orderStatusName)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Đơn hàng #" + linkedOrder.getOrderId() + " chưa được duyệt (trạng thái: " + orderStatusName + "). Chỉ nhập kho khi đơn hàng đã được duyệt hoặc đang lưu kho.");
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

        // Update linked order status → IMPORTED
        orderService.markImported(containerId);

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

        // Reject locked slots
        if (Boolean.TRUE.equals(slot.getIsLocked())) {
            throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                    "Slot " + request.getSlotId() + " is locked" +
                    (slot.getLockReason() != null ? ": " + slot.getLockReason() : ""));
        }

        // Validate tier not already occupied
        if (positionRepository.countBySlotAndTier(request.getSlotId(), request.getTier()) > 0) {
            throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                    "Tier " + request.getTier() + " in slot " + request.getSlotId() + " is occupied");
        }

        // Validate tier within slot max
        if (request.getTier() > slot.getMaxTier()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Tier " + request.getTier() + " exceeds max tier " + slot.getMaxTier());
        }

        ContainerPosition position = positionRepository.findByContainerContainerId(containerId)
                .orElseGet(ContainerPosition::new);
        position.setContainer(container);
        position.setSlot(slot);
        position.setTier(request.getTier());
        ContainerPosition saved = positionRepository.save(position);

        // Update container status → IN_YARD
        containerService.changeStatus(containerId, STATUS_IN_YARD, "Container positioned in slot");

        // Update linked order status → STORED
        orderService.markStored(containerId);

        return saved;
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

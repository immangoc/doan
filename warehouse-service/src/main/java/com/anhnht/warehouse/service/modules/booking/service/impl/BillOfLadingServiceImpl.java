package com.anhnht.warehouse.service.modules.booking.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.booking.dto.request.BillOfLadingRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.BillStatusUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.entity.BillOfLading;
import com.anhnht.warehouse.service.modules.booking.entity.BillOfLadingHistory;
import com.anhnht.warehouse.service.modules.booking.entity.BillOfLadingStatus;
import com.anhnht.warehouse.service.modules.booking.entity.Order;
import com.anhnht.warehouse.service.modules.booking.repository.BillOfLadingHistoryRepository;
import com.anhnht.warehouse.service.modules.booking.repository.BillOfLadingRepository;
import com.anhnht.warehouse.service.modules.booking.repository.BillOfLadingStatusRepository;
import com.anhnht.warehouse.service.modules.booking.service.BillOfLadingService;
import com.anhnht.warehouse.service.modules.booking.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BillOfLadingServiceImpl implements BillOfLadingService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final BillOfLadingRepository        billRepository;
    private final BillOfLadingHistoryRepository historyRepository;
    private final BillOfLadingStatusRepository  statusRepository;
    private final OrderService                  orderService;

    @Override
    public BillOfLading findByOrderId(Integer orderId) {
        return billRepository.findByOrderOrderId(orderId).orElse(null);
    }

    @Override
    public BillOfLading findById(Integer billId) {
        return billRepository.findByIdWithDetails(billId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.INVOICE_NOT_FOUND,
                        "Bill of lading not found: " + billId));
    }

    @Override
    @Transactional
    public BillOfLading create(Integer orderId, BillOfLadingRequest request) {
        Order order = orderService.findById(orderId);

        // Only one BoL per order
        if (billRepository.findByOrderOrderId(orderId).isPresent()) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Bill of lading already exists for order: " + orderId);
        }

        BillOfLadingStatus draftStatus = resolveStatus(STATUS_DRAFT);

        BillOfLading bill = new BillOfLading();
        bill.setOrder(order);
        bill.setStatus(draftStatus);
        bill.setNote(request.getNote());

        String billNumber = StringUtils.hasText(request.getBillNumber())
                ? request.getBillNumber()
                : generateBillNumber(orderId);

        if (billRepository.existsByBillNumber(billNumber)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Bill number already exists: " + billNumber);
        }
        bill.setBillNumber(billNumber);

        BillOfLading saved = billRepository.save(bill);

        // Record initial history entry
        recordHistory(saved, draftStatus, "Bill of lading created");

        return saved;
    }

    @Override
    @Transactional
    public BillOfLading updateStatus(Integer billId, BillStatusUpdateRequest request) {
        BillOfLading bill = findById(billId);
        BillOfLadingStatus newStatus = resolveStatus(request.getStatusName());
        bill.setStatus(newStatus);
        BillOfLading saved = billRepository.save(bill);
        recordHistory(saved, newStatus, request.getDescription());
        return saved;
    }

    @Override
    public List<BillOfLadingHistory> getHistory(Integer billId) {
        findById(billId); // validate existence
        return historyRepository.findByBillIdOrdered(billId);
    }

    // ----------------------------------------------------------------

    private String generateBillNumber(Integer orderId) {
        return "BOL-" + LocalDate.now().format(DATE_FMT) + "-" + orderId;
    }

    private BillOfLadingStatus resolveStatus(String name) {
        return statusRepository.findByStatusNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BAD_REQUEST,
                        "Bill of lading status not found: " + name));
    }

    private void recordHistory(BillOfLading bill, BillOfLadingStatus status, String description) {
        BillOfLadingHistory history = new BillOfLadingHistory();
        history.setBill(bill);
        history.setStatus(status);
        history.setDescription(description);
        historyRepository.save(history);
    }
}

package com.anhnht.warehouse.service.modules.gateout.service.impl;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.GateInReceiptRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.gateout.dto.request.GateOutRequest;
import com.anhnht.warehouse.service.modules.gateout.dto.response.StorageBillResponse;
import com.anhnht.warehouse.service.modules.gateout.dto.response.StorageInvoiceResponse;
import com.anhnht.warehouse.service.modules.gateout.entity.GateOutReceipt;
import com.anhnht.warehouse.service.modules.gateout.entity.StorageInvoice;
import com.anhnht.warehouse.service.modules.gateout.repository.GateOutReceiptRepository;
import com.anhnht.warehouse.service.modules.gateout.repository.StorageInvoiceRepository;
import com.anhnht.warehouse.service.modules.gateout.service.GateOutService;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GateOutServiceImpl implements GateOutService {

    /** Container statuses that allow gate-out. */
    private static final Set<String> ELIGIBLE_STATUSES = Set.of("IN_YARD", "GATE_IN");
    private static final String      STATUS_GATE_OUT    = "GATE_OUT";

    private final GateOutReceiptRepository    receiptRepository;
    private final StorageInvoiceRepository    invoiceRepository;
    private final ContainerPositionRepository positionRepository;
    private final YardStorageRepository       storageRepository;
    private final ContainerService            containerService;
    private final UserRepository              userRepository;
    private final GateInReceiptRepository     gateInReceiptRepository;

    @Override
    @Transactional
    public GateOutReceipt processGateOut(Integer operatorId, GateOutRequest request) {
        String containerId = request.getContainerId();

        Container container = containerService.findById(containerId);

        // Validate container is in an eligible status
        String currentStatus = container.getStatus() != null
                ? container.getStatus().getStatusName() : "";
        if (!ELIGIBLE_STATUSES.contains(currentStatus)) {
            throw new BusinessException(ErrorCode.CONTAINER_NOT_IN_YARD,
                    "Container is not in yard. Current status: " + currentStatus);
        }

        // If the container is eligible for gate-out but legacy gate-out receipts/invoices exist,
        // treat them as stale artifacts (e.g. test data resets) and clean them up.
        // This keeps the schema's UNIQUE(container_id) in storage_invoice consistent.
        cleanupStaleGateOutArtifacts(containerId);

        // 1. Create gate-out receipt
        GateOutReceipt receipt = new GateOutReceipt();
        receipt.setContainer(container);
        receipt.setNote(request.getNote());
        if (operatorId != null) {
            userRepository.findById(operatorId).ifPresent(receipt::setCreatedBy);
        }
        GateOutReceipt saved = receiptRepository.save(receipt);

        // 2. Remove container position (slot is now free)
        positionRepository.findByContainerContainerId(containerId)
                .ifPresent(positionRepository::delete);

        // 3. Persist storage invoice
        persistInvoice(container, saved);

        // 4. Update container status → GATE_OUT
        containerService.changeStatus(containerId, STATUS_GATE_OUT,
                "Container passed gate-out");

        return saved;
    }

    private void cleanupStaleGateOutArtifacts(String containerId) {
        // Delete invoice first (FK to gate_out_receipt) and flush immediately.
        // We must flush before inserting a new invoice due to UNIQUE(container_id).
        invoiceRepository.findByContainerId(containerId).ifPresent(inv -> {
            invoiceRepository.delete(inv);
            invoiceRepository.flush();
        });

        // Then delete all receipts for this container (if any) and flush.
        List<GateOutReceipt> receipts = receiptRepository.findAllByContainerId(containerId);
        if (!receipts.isEmpty()) {
            receiptRepository.deleteAll(receipts);
            receiptRepository.flush();
        }
    }

    private void persistInvoice(Container container, GateOutReceipt receipt) {
        List<YardStorage> records = storageRepository
                .findByContainerIdOrdered(container.getContainerId());
        if (records.isEmpty()) return;

        YardStorage latest    = records.get(0);
        LocalDate   startDate = latest.getStorageStartDate();
        LocalDate   endDate   = latest.getStorageEndDate();
        LocalDate   today     = LocalDate.now();
        LocalDate   billTo    = (endDate != null) ? endDate : today;

        long totalDays = Math.max(ChronoUnit.DAYS.between(startDate, billTo), 1L);
        long billDays  = Math.max(totalDays - AppConstant.STORAGE_FREE_DAYS, 0L);

        BigDecimal dailyRate = BigDecimal.valueOf(AppConstant.STORAGE_DAILY_RATE);
        BigDecimal baseFee   = dailyRate.multiply(BigDecimal.valueOf(billDays))
                                        .setScale(2, RoundingMode.HALF_UP);

        boolean    isOverdue   = endDate != null && today.isAfter(endDate);
        long       overdueDays = isOverdue ? ChronoUnit.DAYS.between(endDate, today) : 0L;
        BigDecimal penalty     = isOverdue
                ? BigDecimal.valueOf(AppConstant.STORAGE_OVERDUE_RATE)
                             .multiply(BigDecimal.valueOf(overdueDays))
                             .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        StorageInvoice invoice = new StorageInvoice();
        invoice.setContainer(container);
        invoice.setGateOutReceipt(receipt);
        invoice.setStorageDays((int) totalDays);
        invoice.setDailyRate(dailyRate);
        invoice.setBaseFee(baseFee);
        invoice.setOverduePenalty(penalty);
        invoice.setTotalFee(baseFee.add(penalty));
        invoice.setIsOverdue(isOverdue);
        invoice.setOverdueDays((int) overdueDays);

        invoiceRepository.save(invoice);
    }

    @Override
    public Page<GateOutReceipt> findAll(Pageable pageable) {
        return receiptRepository.findAllPaged(pageable);
    }

    @Override
    public GateOutReceipt findById(Integer gateOutId) {
        return receiptRepository.findByIdWithDetails(gateOutId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Gate-out receipt not found: " + gateOutId));
    }

    @Override
    public StorageInvoiceResponse getInvoice(Integer gateOutId) {
        StorageInvoice invoice = invoiceRepository.findByGateOutReceiptGateOutId(gateOutId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Invoice not found for gate-out: " + gateOutId));

        String cargoType = null;
        try {
            cargoType = invoice.getContainer() != null && invoice.getContainer().getCargoType() != null
                    ? invoice.getContainer().getCargoType().getCargoTypeName()
                    : null;
        } catch (Exception ignored) {}

        LocalDateTime gateInTime = null;
        try {
            var list = gateInReceiptRepository.findLatestByContainerId(
                    invoice.getContainer().getContainerId(), PageRequest.of(0, 1));
            if (!list.isEmpty()) gateInTime = list.get(0).getGateInTime();
        } catch (Exception ignored) {}

        LocalDateTime gateOutTime = null;
        try {
            gateOutTime = invoice.getGateOutReceipt() != null ? invoice.getGateOutReceipt().getGateOutTime() : null;
        } catch (Exception ignored) {}

        return StorageInvoiceResponse.builder()
                .invoiceId(invoice.getInvoiceId())
                .containerId(invoice.getContainer().getContainerId())
                .cargoType(cargoType)
                .gateOutId(invoice.getGateOutReceipt().getGateOutId())
                .gateInTime(gateInTime)
                .gateOutTime(gateOutTime)
                .storageDays(invoice.getStorageDays())
                .dailyRate(invoice.getDailyRate())
                .baseFee(invoice.getBaseFee())
                .overduePenalty(invoice.getOverduePenalty())
                .totalFee(invoice.getTotalFee())
                .isOverdue(invoice.getIsOverdue())
                .overdueDays(invoice.getOverdueDays())
                .createdAt(invoice.getCreatedAt())
                .build();
    }

    @Override
    public StorageBillResponse computeStorageBill(String containerId) {
        containerService.findById(containerId); // validate existence

        // Get the most recent storage record (or active one)
        List<YardStorage> records = storageRepository.findByContainerIdOrdered(containerId);
        if (records.isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                    "No storage record found for container: " + containerId);
        }

        YardStorage latest      = records.get(0);
        LocalDate   startDate   = latest.getStorageStartDate();
        LocalDate   endDate     = latest.getStorageEndDate();
        LocalDate   today       = LocalDate.now();
        LocalDate   billToDate  = (endDate != null) ? endDate : today;

        long totalDays  = Math.max(ChronoUnit.DAYS.between(startDate, billToDate), 1L);
        long billDays   = Math.max(totalDays - AppConstant.STORAGE_FREE_DAYS, 0L);

        BigDecimal dailyRate  = BigDecimal.valueOf(AppConstant.STORAGE_DAILY_RATE);
        BigDecimal baseFee    = dailyRate.multiply(BigDecimal.valueOf(billDays))
                                         .setScale(2, RoundingMode.HALF_UP);

        // Overdue penalty: if storage_end_date was set but container still hasn't left
        boolean isOverdue   = false;
        long    overdueDays = 0L;
        BigDecimal penalty  = BigDecimal.ZERO;

        if (endDate != null && today.isAfter(endDate) && latest.getStorageEndDate() == null) {
            isOverdue   = true;
            overdueDays = ChronoUnit.DAYS.between(endDate, today);
            penalty     = BigDecimal.valueOf(AppConstant.STORAGE_OVERDUE_RATE)
                                    .multiply(BigDecimal.valueOf(overdueDays))
                                    .setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal total = baseFee.add(penalty);

        return StorageBillResponse.builder()
                .containerId(containerId)
                .yardName(latest.getYard() != null ? latest.getYard().getYardName() : null)
                .storageStartDate(startDate)
                .storageEndDate(latest.getStorageEndDate())
                .storageDays(totalDays)
                .dailyRate(dailyRate)
                .baseFee(baseFee)
                .overduePenalty(penalty)
                .totalFee(total)
                .isOverdue(isOverdue)
                .overdueDays(overdueDays)
                .build();
    }
}

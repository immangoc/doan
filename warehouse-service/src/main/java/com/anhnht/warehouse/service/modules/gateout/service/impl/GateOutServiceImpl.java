package com.anhnht.warehouse.service.modules.gateout.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import com.anhnht.warehouse.service.modules.billing.repository.FeeConfigRepository;
import com.anhnht.warehouse.service.modules.booking.service.OrderService;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

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
    private final OrderService                orderService;
    private final UserRepository              userRepository;
    private final FeeConfigRepository         feeConfigRepository;

    @Override
    @Transactional
    public GateOutReceipt processGateOut(Integer operatorId, GateOutRequest request) {
        String containerId = request.getContainerId();

        // Prevent duplicate gate-out
        if (receiptRepository.existsByContainerContainerId(containerId)) {
            throw new BusinessException(ErrorCode.CONTAINER_ALREADY_EXPORTED,
                    "Container already has a gate-out record: " + containerId);
        }

        Container container = containerService.findById(containerId);

        // Validate container is in an eligible status
        String currentStatus = container.getStatus() != null
                ? container.getStatus().getStatusName() : "";
        if (!ELIGIBLE_STATUSES.contains(currentStatus)) {
            throw new BusinessException(ErrorCode.CONTAINER_NOT_IN_YARD,
                    "Container is not in yard. Current status: " + currentStatus);
        }

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

        // 5. Update linked order status → EXPORTED
        orderService.markExported(containerId);

        return saved;
    }

    private void persistInvoice(Container container, GateOutReceipt receipt) {
        if (invoiceRepository.existsByContainerContainerId(container.getContainerId())) {
            return; // idempotent guard — should not happen, but safe
        }

        List<YardStorage> records = storageRepository
                .findByContainerIdOrdered(container.getContainerId());
        if (records.isEmpty()) return;

        FeeConfig  config    = feeConfigRepository.findAll().stream().findFirst()
                                                  .orElseGet(FeeConfig::new);
        YardStorage latest    = records.get(0);
        LocalDate   startDate = latest.getStorageStartDate();
        LocalDate   endDate   = latest.getStorageEndDate();
        LocalDate   today     = LocalDate.now();
        LocalDate   billTo    = (endDate != null) ? endDate : today;

        long totalDays = Math.max(ChronoUnit.DAYS.between(startDate, billTo), 1L);
        int  freeDays  = config.getFreeStorageDays() != null ? config.getFreeStorageDays() : 3;
        long billDays  = Math.max(totalDays - freeDays, 0L);

        BigDecimal dailyRate    = resolveDailyRate(container, config);
        BigDecimal storeMult    = config.getStorageMultiplier() != null ? config.getStorageMultiplier() : BigDecimal.ONE;
        BigDecimal baseFee      = dailyRate
                .multiply(BigDecimal.valueOf(billDays))
                .multiply(storeMult)
                .setScale(2, RoundingMode.HALF_UP);

        boolean    isOverdue    = endDate != null && today.isAfter(endDate);
        long       overdueDays  = isOverdue ? ChronoUnit.DAYS.between(endDate, today) : 0L;
        BigDecimal penaltyRate  = config.getOverduePenaltyRate() != null ? config.getOverduePenaltyRate() : BigDecimal.ZERO;
        BigDecimal penalty      = isOverdue
                ? baseFee.multiply(penaltyRate)
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

    /**
     * Resolve the effective daily rate for a container:
     * - If container type contains "20" and containerRate20ft > 0 → use containerRate20ft
     * - If container type contains "40" and containerRate40ft > 0 → use containerRate40ft
     * - Otherwise → ratePerKgDefault × grossWeight × weightMultiplier
     */
    private BigDecimal resolveDailyRate(Container container, FeeConfig config) {
        String typeName = container.getContainerType() != null
                ? container.getContainerType().getContainerTypeName() : "";

        if (typeName.contains("20") && config.getContainerRate20ft() != null
                && config.getContainerRate20ft().compareTo(BigDecimal.ZERO) > 0) {
            return config.getContainerRate20ft();
        }
        if (typeName.contains("40") && config.getContainerRate40ft() != null
                && config.getContainerRate40ft().compareTo(BigDecimal.ZERO) > 0) {
            return config.getContainerRate40ft();
        }

        // Weight-based rate
        BigDecimal rate       = config.getRatePerKgDefault() != null ? config.getRatePerKgDefault() : BigDecimal.valueOf(1000);
        BigDecimal weight     = container.getGrossWeight() != null && container.getGrossWeight().compareTo(BigDecimal.ZERO) > 0
                ? container.getGrossWeight() : BigDecimal.ONE;
        BigDecimal weightMult = config.getWeightMultiplier() != null ? config.getWeightMultiplier() : BigDecimal.ONE;
        return rate.multiply(weight).multiply(weightMult).setScale(2, RoundingMode.HALF_UP);
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
        return StorageInvoiceResponse.builder()
                .invoiceId(invoice.getInvoiceId())
                .containerId(invoice.getContainer().getContainerId())
                .gateOutId(invoice.getGateOutReceipt().getGateOutId())
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
        Container container = containerService.findById(containerId);

        List<YardStorage> records = storageRepository.findByContainerIdOrdered(containerId);
        if (records.isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                    "No storage record found for container: " + containerId);
        }

        FeeConfig  config    = feeConfigRepository.findAll().stream().findFirst()
                                                  .orElseGet(FeeConfig::new);
        YardStorage latest    = records.get(0);
        LocalDate   startDate = latest.getStorageStartDate();
        LocalDate   endDate   = latest.getStorageEndDate();
        LocalDate   today     = LocalDate.now();
        LocalDate   billToDate = (endDate != null) ? endDate : today;

        long totalDays = Math.max(ChronoUnit.DAYS.between(startDate, billToDate), 1L);
        int  freeDays  = config.getFreeStorageDays() != null ? config.getFreeStorageDays() : 3;
        long billDays  = Math.max(totalDays - freeDays, 0L);

        BigDecimal dailyRate  = resolveDailyRate(container, config);
        BigDecimal storeMult  = config.getStorageMultiplier() != null ? config.getStorageMultiplier() : BigDecimal.ONE;
        BigDecimal baseFee    = dailyRate
                .multiply(BigDecimal.valueOf(billDays))
                .multiply(storeMult)
                .setScale(2, RoundingMode.HALF_UP);

        boolean    isOverdue   = endDate != null && today.isAfter(endDate);
        long       overdueDays = isOverdue ? ChronoUnit.DAYS.between(endDate, today) : 0L;
        BigDecimal penaltyRate = config.getOverduePenaltyRate() != null ? config.getOverduePenaltyRate() : BigDecimal.ZERO;
        BigDecimal penalty     = isOverdue
                ? baseFee.multiply(penaltyRate)
                         .multiply(BigDecimal.valueOf(overdueDays))
                         .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return StorageBillResponse.builder()
                .containerId(containerId)
                .yardName(latest.getYard() != null ? latest.getYard().getYardName() : null)
                .storageStartDate(startDate)
                .storageEndDate(latest.getStorageEndDate())
                .storageDays(totalDays)
                .dailyRate(dailyRate)
                .baseFee(baseFee)
                .overduePenalty(penalty)
                .totalFee(baseFee.add(penalty))
                .isOverdue(isOverdue)
                .overdueDays(overdueDays)
                .build();
    }
}

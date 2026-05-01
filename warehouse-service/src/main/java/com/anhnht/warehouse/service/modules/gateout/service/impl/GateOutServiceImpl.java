package com.anhnht.warehouse.service.modules.gateout.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import com.anhnht.warehouse.service.modules.billing.entity.Tariff;
import com.anhnht.warehouse.service.modules.billing.repository.FeeConfigRepository;
import com.anhnht.warehouse.service.modules.billing.repository.TariffRepository;
import com.anhnht.warehouse.service.modules.booking.repository.OrderRepository;
import com.anhnht.warehouse.service.modules.booking.service.OrderService;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationMove;
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
import com.anhnht.warehouse.service.modules.yard.service.StackingRelocationHelper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

@Slf4j
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
    private final OrderRepository             orderRepository;
    private final UserRepository              userRepository;
    private final FeeConfigRepository         feeConfigRepository;
    private final TariffRepository            tariffRepository;
    private final GateInReceiptRepository     gateInReceiptRepository;
    private final StackingRelocationHelper    stackingHelper;
    private final ObjectMapper                objectMapper;

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

        // 1. Create gate-out receipt with position snapshot
        GateOutReceipt receipt = new GateOutReceipt();
        receipt.setContainer(container);
        receipt.setNote(request.getNote());
        if (operatorId != null) {
            userRepository.findById(operatorId).ifPresent(receipt::setCreatedBy);
        }

        // Snapshot the current position so the export listing / history can still
        // show where the container used to be after its ContainerPosition is deleted.
        positionRepository.findByContainerContainerId(containerId).ifPresent(cp -> {
            if (cp.getSlot() != null) {
                var block = cp.getSlot().getBlock();
                var zone  = block != null ? block.getZone() : null;
                var yard  = zone  != null ? zone.getYard()  : null;
                receipt.setLastRowNo(cp.getSlot().getRowNo());
                receipt.setLastBayNo(cp.getSlot().getBayNo());
                receipt.setLastTier(cp.getTier());
                if (block != null) receipt.setLastBlockName(block.getBlockName());
                if (zone  != null) receipt.setLastZoneName(zone.getZoneName());
                if (yard  != null) receipt.setLastYardName(yard.getYardName());
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // ★ Resolve blockers: relocate any containers stacked above this one
        // ═══════════════════════════════════════════════════════════════════════
        List<RelocationMove> relocationMoves = stackingHelper.resolveBlockers(
                containerId, "BLOCKER_OF_GATE_OUT");

        if (!relocationMoves.isEmpty()) {
            String message = buildRelocationMessage(relocationMoves, "xuất kho");
            receipt.setRelocationMessage(message);
            try {
                receipt.setRelocationPlanJson(objectMapper.writeValueAsString(relocationMoves));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize relocation plan", e);
            }
            log.info("[GateOut] container={} required {} blocker relocations before gate-out",
                    containerId, relocationMoves.size());
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

        YardStorage latest    = records.get(0);
        LocalDate   startDate = latest.getStorageStartDate();
        LocalDate   endDate   = latest.getStorageEndDate();
        LocalDate   today     = LocalDate.now();
        LocalDate   billTo    = (endDate != null) ? endDate : today;

        long totalDays = Math.max(ChronoUnit.DAYS.between(startDate, billTo), 1L);

        // Use the admin tariff table — same formula as OrderServiceImpl.previewFee
        // so the gate-out invoice matches what was quoted at order creation.
        List<Tariff> tariffs    = tariffRepository.findAll();
        int          size       = resolveContainerSize(container);
        Integer      cargoTypeId = container.getCargoType() != null
                ? container.getCargoType().getCargoTypeId() : null;

        BigDecimal dailyRate  = resolveStorageTariff(tariffs, size, cargoTypeId);
        BigDecimal timeMult   = resolveTimeMultiplier(tariffs, totalDays);
        BigDecimal weightMult = resolveWeightMultiplier(tariffs, container.getGrossWeight());

        BigDecimal baseFee    = dailyRate
                .multiply(BigDecimal.valueOf(totalDays))
                .multiply(timeMult)
                .multiply(weightMult)
                .setScale(2, RoundingMode.HALF_UP);

        boolean    isOverdue   = endDate != null && today.isAfter(endDate);
        long       overdueDays = isOverdue ? ChronoUnit.DAYS.between(endDate, today) : 0L;
        FeeConfig  config      = feeConfigRepository.findAll().stream().findFirst()
                                                    .orElseGet(FeeConfig::new);
        BigDecimal penaltyRate = config.getOverduePenaltyRate() != null ? config.getOverduePenaltyRate() : BigDecimal.ZERO;
        BigDecimal penalty     = isOverdue
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

    private int resolveContainerSize(Container container) {
        String typeName = container.getContainerType() != null
                ? container.getContainerType().getContainerTypeName() : "";
        return typeName != null && typeName.contains("40") ? 40 : 20;
    }

    /** Find the STORAGE tariff rate matching container size + cargo type. */
    private BigDecimal resolveStorageTariff(List<Tariff> tariffs, int containerSize, Integer cargoTypeId) {
        if (cargoTypeId != null) {
            for (Tariff t : tariffs) {
                if ("STORAGE".equals(t.getFeeType())
                        && t.getContainerSize() != null && t.getContainerSize() == containerSize
                        && t.getCargoType() != null && cargoTypeId.equals(t.getCargoType().getCargoTypeId())) {
                    return t.getUnitPrice();
                }
            }
        }
        for (Tariff t : tariffs) {
            if ("STORAGE".equals(t.getFeeType())
                    && t.getContainerSize() != null && t.getContainerSize() == containerSize) {
                return t.getUnitPrice();
            }
        }
        return BigDecimal.valueOf(150000);
    }

    /** Resolve TIME_MULTIPLIER from tariffs based on storage days. */
    private BigDecimal resolveTimeMultiplier(List<Tariff> tariffs, long days) {
        for (Tariff t : tariffs) {
            if (!"TIME_MULTIPLIER".equals(t.getFeeType())) continue;
            String code = t.getTariffCode();
            if ("TIME_MULTIPLIER_LE_5".equals(code) && days <= 5) return t.getUnitPrice();
            if ("TIME_MULTIPLIER_6_10".equals(code) && days >= 6 && days <= 10) return t.getUnitPrice();
            if ("TIME_MULTIPLIER_GT_10".equals(code) && days > 10) return t.getUnitPrice();
        }
        return BigDecimal.ONE;
    }

    /** Resolve WEIGHT_MULTIPLIER from tariffs based on gross weight. */
    private BigDecimal resolveWeightMultiplier(List<Tariff> tariffs, BigDecimal weightKg) {
        double tons = weightKg != null ? weightKg.doubleValue() / 1000.0 : 0;
        for (Tariff t : tariffs) {
            if (!"WEIGHT_MULTIPLIER".equals(t.getFeeType())) continue;
            String code = t.getTariffCode();
            if ("WEIGHT_MULTIPLIER_LT_10".equals(code) && tons < 10) return t.getUnitPrice();
            if ("WEIGHT_MULTIPLIER_10_20".equals(code) && tons >= 10 && tons <= 20) return t.getUnitPrice();
            if ("WEIGHT_MULTIPLIER_GT_20".equals(code) && tons > 20) return t.getUnitPrice();
        }
        return BigDecimal.ONE;
    }

    /** Resolve LATE_FEE from tariffs based on overdue days. */
    private BigDecimal resolveLateFee(List<Tariff> tariffs, long overdueDays) {
        for (Tariff t : tariffs) {
            if (!"LATE_FEE".equals(t.getFeeType())) continue;
            String code = t.getTariffCode();
            if ("LATE_FEE_1_2".equals(code) && overdueDays >= 1 && overdueDays <= 2) return t.getUnitPrice();
            if ("LATE_FEE_3_5".equals(code) && overdueDays >= 3 && overdueDays <= 5) return t.getUnitPrice();
            if ("LATE_FEE_GT_5".equals(code) && overdueDays > 5) return t.getUnitPrice();
        }
        return BigDecimal.ZERO;
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

        Container container = invoice.getContainer();
        GateOutReceipt receipt = invoice.getGateOutReceipt();

        String cargoTypeName = container.getCargoType() != null
                ? container.getCargoType().getCargoTypeName() : null;
        String containerTypeName = container.getContainerType() != null
                ? container.getContainerType().getContainerTypeName() : null;

        var gateInTime = gateInReceiptRepository
                .findFirstByContainerContainerIdOrderByGateInTimeDesc(container.getContainerId())
                .map(g -> g.getGateInTime())
                .orElse(null);

        // ── Recalculate fees using tariff table + order dates ──
        BigDecimal orderPaidAmount = null;
        Integer orderId = null;
        BigDecimal dailyRate = invoice.getDailyRate();
        int storageDays = invoice.getStorageDays();
        BigDecimal baseFee = invoice.getBaseFee();
        BigDecimal totalFee = invoice.getTotalFee();
        BigDecimal overduePenalty = invoice.getOverduePenalty();
        boolean isOverdue = Boolean.TRUE.equals(invoice.getIsOverdue());
        int overdueDays = invoice.getOverdueDays() != null ? invoice.getOverdueDays() : 0;

        try {
            // Find all orders for this container (any status), pick best one
            var orders = orderRepository.findOrdersByContainerId(container.getContainerId());
            // Prefer order with paidAmount set, or the most recent with dates
            var order = orders.stream()
                    .filter(o -> o.getPaidAmount() != null && o.getPaidAmount().compareTo(BigDecimal.ZERO) > 0)
                    .findFirst()
                    .or(() -> orders.stream().filter(o -> o.getImportDate() != null && o.getExportDate() != null).findFirst())
                    .orElse(orders.isEmpty() ? null : orders.get(0));
            if (order != null) {
                orderId = order.getOrderId();
                orderPaidAmount = order.getPaidAmount();

                // Recalculate using tariff table (same formula as OrderServiceImpl.previewFee)
                if (order.getImportDate() != null && order.getExportDate() != null) {
                    long days = ChronoUnit.DAYS.between(order.getImportDate(), order.getExportDate());
                    if (days <= 0) days = 1;
                    storageDays = (int) days;

                    List<Tariff> tariffs = tariffRepository.findAll();
                    int size = resolveContainerSize(container);
                    Integer cTypeId = container.getCargoType() != null
                            ? container.getCargoType().getCargoTypeId() : null;

                    dailyRate = resolveStorageTariff(tariffs, size, cTypeId);
                    BigDecimal timeMult = resolveTimeMultiplier(tariffs, days);
                    BigDecimal weightMult = resolveWeightMultiplier(tariffs, container.getGrossWeight());

                    baseFee = dailyRate
                            .multiply(BigDecimal.valueOf(days))
                            .multiply(timeMult)
                            .multiply(weightMult)
                            .setScale(0, RoundingMode.HALF_UP);

                    // Overdue: if gate-out happened after the export date
                    LocalDate exitDate = order.getExportDate();
                    LocalDate gateOutDate = receipt.getGateOutTime() != null
                            ? receipt.getGateOutTime().toLocalDate() : LocalDate.now();
                    isOverdue = gateOutDate.isAfter(exitDate);
                    overdueDays = isOverdue
                            ? (int) ChronoUnit.DAYS.between(exitDate, gateOutDate)
                            : 0;

                    // Late fee from tariff table
                    overduePenalty = BigDecimal.ZERO;
                    if (isOverdue) {
                        overduePenalty = resolveLateFee(tariffs, overdueDays);
                    }

                    totalFee = baseFee.add(overduePenalty);

                    // If paid amount is available, use it as total (what customer actually paid)
                    if (orderPaidAmount != null && orderPaidAmount.compareTo(BigDecimal.ZERO) > 0) {
                        totalFee = orderPaidAmount;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[Invoice] Failed to recalculate from order for gate-out {}: {}", gateOutId, e.getMessage());
        }

        return StorageInvoiceResponse.builder()
                .invoiceId(invoice.getInvoiceId())
                .containerId(container.getContainerId())
                .containerCode(container.getContainerId())
                .cargoTypeName(cargoTypeName)
                .containerTypeName(containerTypeName)
                .gateOutId(receipt.getGateOutId())
                .gateInTime(gateInTime)
                .gateOutTime(receipt.getGateOutTime())
                .storageDays(storageDays)
                .dailyRate(dailyRate)
                .baseFee(baseFee)
                .overduePenalty(overduePenalty)
                .totalFee(totalFee)
                .orderPaidAmount(orderPaidAmount)
                .orderId(orderId)
                .isOverdue(isOverdue)
                .overdueDays(overdueDays)
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

    // ──────────────────────────────────────────── relocation message builder

    /**
     * Builds a human-readable Vietnamese message about relocation moves for the user.
     */
    static String buildRelocationMessage(List<RelocationMove> moves, String action) {
        if (moves == null || moves.isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        sb.append("⚠️ Để ").append(action).append(", hệ thống đã đảo chuyển ")
          .append(moves.size()).append(" container chặn:\n");
        for (int i = 0; i < moves.size(); i++) {
            RelocationMove m = moves.get(i);
            sb.append(String.format("  %d. %s: %s R%dB%d Tier%d → %s R%dB%d Tier%d\n",
                    i + 1,
                    m.getContainerId(),
                    m.getFromZone(), m.getFromRow(), m.getFromBay(), m.getFromTier(),
                    m.getToZone(),   m.getToRow(),   m.getToBay(),   m.getToTier()));
        }
        return sb.toString().trim();
    }
}

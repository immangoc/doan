package com.anhnht.warehouse.service.modules.booking.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import com.anhnht.warehouse.service.modules.billing.entity.Tariff;
import com.anhnht.warehouse.service.modules.billing.repository.FeeConfigRepository;
import com.anhnht.warehouse.service.modules.billing.repository.TariffRepository;
import com.anhnht.warehouse.service.modules.booking.dto.response.FeePreviewResponse;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderCancelRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderExportDateUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderStatusUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.response.OrderExportDateFeeResponse;
import com.anhnht.warehouse.service.modules.booking.entity.Order;
import com.anhnht.warehouse.service.modules.booking.entity.OrderCancellation;
import com.anhnht.warehouse.service.modules.booking.entity.OrderStatus;
import com.anhnht.warehouse.service.modules.booking.repository.OrderCancellationRepository;
import com.anhnht.warehouse.service.modules.booking.repository.OrderRepository;
import com.anhnht.warehouse.service.modules.booking.repository.OrderStatusRepository;
import com.anhnht.warehouse.service.modules.booking.service.OrderService;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.repository.ContainerRepository;
import com.anhnht.warehouse.service.modules.alert.service.NotificationService;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.wallet.entity.Wallet;
import com.anhnht.warehouse.service.modules.wallet.service.WalletService;
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

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final String STATUS_PENDING           = "PENDING";
    private static final String STATUS_APPROVED          = "APPROVED";
    private static final String STATUS_REJECTED          = "REJECTED";
    private static final String STATUS_CANCELLED         = "CANCELLED";
    private static final String STATUS_CANCEL_REQUESTED  = "CANCEL_REQUESTED";
    private static final String STATUS_WAITING_CHECKIN   = "WAITING_CHECKIN";
    private static final String STATUS_LATE_CHECKIN      = "LATE_CHECKIN";
    private static final String STATUS_READY_FOR_IMPORT  = "READY_FOR_IMPORT";
    private static final String STATUS_IMPORTED          = "IMPORTED";
    private static final String STATUS_STORED            = "STORED";
    private static final String STATUS_EXPORTED          = "EXPORTED";

    private static final List<String> TERMINAL_STATUSES =
            List.of(STATUS_CANCELLED, STATUS_REJECTED, STATUS_EXPORTED, "GATE_OUT");

    private final OrderRepository            orderRepository;
    private final OrderStatusRepository      orderStatusRepository;
    private final OrderCancellationRepository cancellationRepository;
    private final ContainerRepository        containerRepository;
    private final UserRepository             userRepository;
    private final NotificationService        notificationService;
    private final FeeConfigRepository        feeConfigRepository;
    private final TariffRepository           tariffRepository;
    private final WalletService              walletService;

    @Override
    public Page<Order> findAll(String statusName, String keyword, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();
        return orderRepository.findAllFiltered(statusName, kw, pageable);
    }

    @Override
    public Page<Order> findMyOrders(Integer customerId, Pageable pageable) {
        return orderRepository.findByCustomerUserId(customerId, pageable);
    }

    @Override
    public Order findById(Integer orderId) {
        return orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BOOKING_NOT_FOUND,
                        "Order not found: " + orderId));
    }

    @Override
    public FeePreviewResponse previewFee(OrderRequest request) {
        if (request.getImportDate() == null || request.getExportDate() == null) {
            return FeePreviewResponse.builder()
                    .totalFee(BigDecimal.ZERO).storageDays(0)
                    .timeMultiplier(BigDecimal.ONE).weightMultiplier(BigDecimal.ONE)
                    .containerDetails(List.of()).build();
        }
        long days = ChronoUnit.DAYS.between(request.getImportDate(), request.getExportDate());
        if (days <= 0) days = 1;

        // Load all tariffs from DB
        List<Tariff> allTariffs = tariffRepository.findAll();

        // Resolve time multiplier from tariffs
        BigDecimal timeMult = resolveTimeMultiplier(allTariffs, days);

        // Build per-container detail
        List<FeePreviewResponse.ContainerFeeDetail> details = new java.util.ArrayList<>();
        BigDecimal grandTotal = BigDecimal.ZERO;
        BigDecimal maxWeightMult = BigDecimal.ONE;

        if (request.getContainerIds() != null && !request.getContainerIds().isEmpty()) {
            for (String cid : request.getContainerIds()) {
                Container container = containerRepository.findById(cid).orElse(null);
                if (container == null) continue;

                int size = 20; // default
                String containerTypeName = "";
                if (container.getContainerType() != null) {
                    containerTypeName = container.getContainerType().getContainerTypeName();
                    if (containerTypeName.contains("40")) size = 40;
                }

                String cargoTypeName = "";
                Integer cargoTypeId = null;
                if (container.getCargoType() != null) {
                    cargoTypeName = container.getCargoType().getCargoTypeName();
                    cargoTypeId = container.getCargoType().getCargoTypeId();
                }

                BigDecimal weight = container.getGrossWeight() != null ? container.getGrossWeight() : BigDecimal.ZERO;
                BigDecimal weightMult = resolveWeightMultiplier(allTariffs, weight);
                if (weightMult.compareTo(maxWeightMult) > 0) maxWeightMult = weightMult;

                // Find matching STORAGE tariff
                BigDecimal dailyRate = resolveStorageTariff(allTariffs, size, cargoTypeId);

                BigDecimal subtotal = dailyRate
                        .multiply(BigDecimal.valueOf(days))
                        .multiply(timeMult)
                        .multiply(weightMult)
                        .setScale(0, RoundingMode.HALF_UP);

                details.add(FeePreviewResponse.ContainerFeeDetail.builder()
                        .containerId(cid)
                        .containerTypeName(containerTypeName)
                        .cargoTypeName(cargoTypeName)
                        .containerSize(size)
                        .grossWeight(weight)
                        .dailyRate(dailyRate)
                        .subtotal(subtotal)
                        .build());

                grandTotal = grandTotal.add(subtotal);
            }
        } else {
            // No containers selected yet — use default 20ft dry rate
            BigDecimal dailyRate = resolveStorageTariff(allTariffs, 20, null);
            BigDecimal subtotal = dailyRate
                    .multiply(BigDecimal.valueOf(days))
                    .multiply(timeMult)
                    .setScale(0, RoundingMode.HALF_UP);

            details.add(FeePreviewResponse.ContainerFeeDetail.builder()
                    .containerId("(mặc định)")
                    .containerTypeName("20ft")
                    .cargoTypeName("Hàng Khô")
                    .containerSize(20)
                    .grossWeight(BigDecimal.ZERO)
                    .dailyRate(dailyRate)
                    .subtotal(subtotal)
                    .build());

            grandTotal = subtotal;
        }

        return FeePreviewResponse.builder()
                .totalFee(grandTotal)
                .storageDays(days)
                .timeMultiplier(timeMult)
                .weightMultiplier(maxWeightMult)
                .containerDetails(details)
                .build();
    }

    /** Find the STORAGE tariff rate matching container size + cargo type. */
    private BigDecimal resolveStorageTariff(List<Tariff> tariffs, int containerSize, Integer cargoTypeId) {
        // Try exact match: size + cargoType
        if (cargoTypeId != null) {
            for (Tariff t : tariffs) {
                if ("STORAGE".equals(t.getFeeType())
                        && t.getContainerSize() != null && t.getContainerSize() == containerSize
                        && t.getCargoType() != null && cargoTypeId.equals(t.getCargoType().getCargoTypeId())) {
                    return t.getUnitPrice();
                }
            }
        }
        // Fallback: first STORAGE tariff matching size (usually DRY)
        for (Tariff t : tariffs) {
            if ("STORAGE".equals(t.getFeeType())
                    && t.getContainerSize() != null && t.getContainerSize() == containerSize) {
                return t.getUnitPrice();
            }
        }
        return BigDecimal.valueOf(150000); // absolute fallback
    }

    /** Resolve TIME_MULTIPLIER from tariffs based on storage days. */
    private BigDecimal resolveTimeMultiplier(List<Tariff> tariffs, long days) {
        // Tariff codes: TIME_MULTIPLIER_LE_5 (≤5), TIME_MULTIPLIER_6_10 (6-10), TIME_MULTIPLIER_GT_10 (>10)
        BigDecimal result = BigDecimal.ONE;
        for (Tariff t : tariffs) {
            if (!"TIME_MULTIPLIER".equals(t.getFeeType())) continue;
            String code = t.getTariffCode();
            if ("TIME_MULTIPLIER_LE_5".equals(code) && days <= 5) return t.getUnitPrice();
            if ("TIME_MULTIPLIER_6_10".equals(code) && days >= 6 && days <= 10) return t.getUnitPrice();
            if ("TIME_MULTIPLIER_GT_10".equals(code) && days > 10) return t.getUnitPrice();
        }
        return result;
    }

    /** Resolve WEIGHT_MULTIPLIER from tariffs based on gross weight in tons. */
    private BigDecimal resolveWeightMultiplier(List<Tariff> tariffs, BigDecimal weightKg) {
        // Convert to tons (weight in DB is typically in kg or tons — tariffs say <10t, 10-20t, >20t)
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

    @Override
    @Transactional
    public Order create(Integer customerId, OrderRequest request) {
        OrderStatus pending = resolveStatus(STATUS_PENDING);

        Order order = new Order();
        order.setCustomerName(request.getCustomerName());
        order.setPhone(request.getPhone());
        order.setEmail(request.getEmail());
        order.setAddress(request.getAddress());
        order.setNote(request.getNote());
        order.setImportDate(request.getImportDate());
        order.setExportDate(request.getExportDate());
        order.setStatus(pending);

        if (customerId != null) {
            User customer = userRepository.findById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND,
                            "User not found: " + customerId));
            order.setCustomer(customer);

            long eligibleCount = containerRepository.countEligibleByOwner(customerId, TERMINAL_STATUSES, -1);
            if (eligibleCount == 0) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Bạn cần đăng ký ít nhất một container trước khi tạo đơn hàng");
            }
        }

        // Optionally link containers at creation time
        if (request.getContainerIds() != null) {
            for (String cid : request.getContainerIds()) {
                Container container = containerRepository.findById(cid)
                        .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                                "Container not found: " + cid));
                long active = orderRepository.countActiveOrdersForContainer(cid, TERMINAL_STATUSES);
                if (active > 0) {
                    throw new BusinessException(ErrorCode.BAD_REQUEST,
                            "Container " + cid + " đã được sử dụng trong một đơn hàng đang hoạt động khác");
                }
                order.getContainers().add(container);
            }
        }

        Order saved = orderRepository.save(order);

        // Deduct payment if confirmed
        if (Boolean.TRUE.equals(request.getConfirmPayment()) && customerId != null) {
            BigDecimal feeAmount = previewFee(request).getTotalFee();
            if (feeAmount.compareTo(BigDecimal.ZERO) > 0) {
                walletService.debitWalletForInvoice(customerId, feeAmount, 
                    "Thanh toán phí lưu kho đơn hàng #" + saved.getOrderId());
                saved.setPaidAmount(feeAmount);
                orderRepository.save(saved);
            }
        }

        // Notify ADMIN and OPERATOR users about new order
        List<Integer> staffIds = userRepository.findUserIdsByRoleNames(List.of("ADMIN", "OPERATOR"));
        if (!staffIds.isEmpty()) {
            notificationService.notify(
                    "Đơn hàng mới #" + saved.getOrderId(),
                    "Khách hàng " + saved.getCustomerName() + " vừa tạo đơn hàng mới chờ duyệt.",
                    staffIds.toArray(new Integer[0]));
        }

        return saved;
    }

    @Override
    @Transactional
    public Order update(Integer orderId, OrderUpdateRequest request) {
        Order order = findById(orderId);
        if (!STATUS_PENDING.equalsIgnoreCase(order.getStatus().getStatusName())) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Only PENDING orders can be edited. Current status: "
                    + order.getStatus().getStatusName());
        }
        order.setCustomerName(request.getCustomerName());
        order.setPhone(request.getPhone());
        order.setEmail(request.getEmail());
        order.setAddress(request.getAddress());
        order.setNote(request.getNote());
        if (request.getImportDate() != null) order.setImportDate(request.getImportDate());
        if (request.getExportDate() != null) order.setExportDate(request.getExportDate());

        if (request.getContainerIds() != null) {
            order.getContainers().clear();
            for (String cid : request.getContainerIds()) {
                Container container = containerRepository.findById(cid)
                        .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                                "Container not found: " + cid));
                long active = orderRepository.countActiveOrdersForContainerExcluding(cid, TERMINAL_STATUSES, orderId);
                if (active > 0) {
                    throw new BusinessException(ErrorCode.BAD_REQUEST,
                            "Container " + cid + " đã được sử dụng trong một đơn hàng đang hoạt động khác");
                }
                order.getContainers().add(container);
            }
        }

        return orderRepository.save(order);
    }

    @Override
    @Transactional
    public Order updateStatus(Integer orderId, OrderStatusUpdateRequest request) {
        Order order = findById(orderId);
        OrderStatus newStatus = resolveStatus(request.getStatusName());
        order.setStatus(newStatus);
        Order saved = orderRepository.save(order);

        // Send notifications for specific status changes
        String newStatusName = request.getStatusName();
        if (order.getCustomer() != null) {
            Integer customerId = order.getCustomer().getUserId();
            if (STATUS_LATE_CHECKIN.equalsIgnoreCase(newStatusName)) {
                notificationService.notify(
                        "⚠️ Trễ check-in — Đơn #" + orderId,
                        "Container của đơn hàng #" + orderId + " đã quá hạn check-in. Vui lòng liên hệ quản lý kho để xử lý.",
                        customerId);
                log.info("[Notification] Late check-in notification sent for order #{} to userId={}", orderId, customerId);
            } else if (STATUS_READY_FOR_IMPORT.equalsIgnoreCase(newStatusName)) {
                notificationService.notify(
                        "📦 Chờ nhập kho — Đơn #" + orderId,
                        "Đơn hàng #" + orderId + " đã sẵn sàng nhập kho. Container sẽ được xử lý nhập kho.",
                        customerId);
                log.info("[Notification] Ready-for-import notification sent for order #{} to userId={}", orderId, customerId);
            } else if (STATUS_WAITING_CHECKIN.equalsIgnoreCase(newStatusName)) {
                notificationService.notify(
                        "🔔 Chờ check-in — Đơn #" + orderId,
                        "Đơn hàng #" + orderId + " đang chờ check-in. Vui lòng chuẩn bị container.",
                        customerId);
            }
        }

        return saved;
    }

    @Override
    @Transactional
    public Order cancel(Integer orderId, OrderCancelRequest request) {
        Order order = findById(orderId);

        String currentStatus = order.getStatus().getStatusName();
        if (STATUS_CANCELLED.equalsIgnoreCase(currentStatus)
                || STATUS_CANCEL_REQUESTED.equalsIgnoreCase(currentStatus)) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CANCEL,
                    "Order is already cancelled or cancellation is pending review");
        }
        if ("COMPLETED".equalsIgnoreCase(currentStatus)
                || STATUS_EXPORTED.equalsIgnoreCase(currentStatus)
                || STATUS_REJECTED.equalsIgnoreCase(currentStatus)) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CANCEL,
                    "Order in status " + currentStatus + " cannot be cancelled");
        }

        // PENDING → direct cancel (no stock committed, no admin review needed)
        // Any later status → CANCEL_REQUESTED so admin can review and process refund
        String targetStatus = STATUS_PENDING.equalsIgnoreCase(currentStatus)
                ? STATUS_CANCELLED
                : STATUS_CANCEL_REQUESTED;

        order.setStatus(resolveStatus(targetStatus));

        OrderCancellation cancellation = new OrderCancellation();
        cancellation.setOrder(order);
        cancellation.setReason(request.getReason());
        cancellationRepository.save(cancellation);

        if (STATUS_CANCEL_REQUESTED.equals(targetStatus)) {
            // Notify admin/operator that customer wants to cancel
            List<Integer> staffIds = userRepository.findUserIdsByRoleNames(List.of("ADMIN", "OPERATOR"));
            if (!staffIds.isEmpty()) {
                notificationService.notify(
                        "Yêu cầu hủy đơn #" + orderId,
                        "Khách hàng " + order.getCustomerName() + " yêu cầu hủy đơn hàng. Vui lòng xem xét và xử lý.",
                        staffIds.toArray(new Integer[0]));
            }
        } else if (STATUS_CANCELLED.equals(targetStatus)) {
            processRefundIfApplicable(order);
        }

        orderRepository.save(order);

        return order;
    }

    private void processRefundIfApplicable(Order order) {
        if (order.getPaidAmount() != null && order.getPaidAmount().compareTo(BigDecimal.ZERO) > 0 && order.getCustomer() != null) {
            walletService.creditWalletForRefund(
                    order.getCustomer().getUserId(),
                    order.getPaidAmount(),
                    "Hoàn tiền do hủy đơn hàng #" + order.getOrderId()
            );
            log.info("Refunded {} to customer {} for cancelled order #{}", order.getPaidAmount(), order.getCustomer().getUserId(), order.getOrderId());
            order.setPaidAmount(BigDecimal.ZERO); // Prevent double refund
        }
    }

    @Override
    @Transactional
    public Order addContainer(Integer orderId, String containerId) {
        Order order = findById(orderId);
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Container not found: " + containerId));
        order.getContainers().add(container);
        return orderRepository.save(order);
    }

    @Override
    @Transactional
    public Order removeContainer(Integer orderId, String containerId) {
        Order order = findById(orderId);
        order.getContainers().removeIf(c -> c.getContainerId().equals(containerId));
        return orderRepository.save(order);
    }

    @Override
    @Transactional
    public Order approve(Integer orderId) {
        Order order = findById(orderId);
        String current = order.getStatus().getStatusName();
        if (!STATUS_PENDING.equalsIgnoreCase(current)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Only PENDING orders can be approved. Current status: " + current);
        }
        // Approval transitions directly to "waiting for check-in"
        order.setStatus(resolveStatus(STATUS_WAITING_CHECKIN));
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            log.info("[Notification] Sending approval notification for order #{} to userId={}",
                    orderId, order.getCustomer().getUserId());
            notificationService.notify(
                    "Đơn hàng #" + orderId + " đã được duyệt",
                    "Đơn hàng của bạn đã được xét duyệt. Vui lòng mang container đến cổng để làm thủ tục nhập kho.",
                    order.getCustomer().getUserId());
        } else {
            log.warn("[Notification] Order #{} has no customer — notification skipped", orderId);
        }
        return order;
    }

    /** Called by gate-in service when a container belonging to this order is physically received. */
    @Override
    @Transactional
    public void markImported(String containerId) {
        Order order = orderRepository.findActiveOrderByContainerId(containerId,
                List.of(STATUS_READY_FOR_IMPORT, STATUS_WAITING_CHECKIN, STATUS_LATE_CHECKIN, STATUS_APPROVED,
                        STATUS_IMPORTED, STATUS_STORED, "DAMAGED", "REPAIRED"))
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND,
                        "Không tìm thấy đơn hàng hợp lệ cho container: " + containerId));
        // Only advance to IMPORTED if the order hasn't already reached IMPORTED or STORED
        String currentStatus = order.getStatus().getStatusName();
        if (!STATUS_IMPORTED.equalsIgnoreCase(currentStatus) && !STATUS_STORED.equalsIgnoreCase(currentStatus)) {
            order.setStatus(resolveStatus(STATUS_IMPORTED));
            orderRepository.save(order);
        }
        log.info("[Order] Container {} gate-in → Order #{} → {}", containerId, order.getOrderId(), order.getStatus().getStatusName());
        if (order.getCustomer() != null) {
            notificationService.notify(
                    "Container đã nhập kho — Đơn #" + order.getOrderId(),
                    "Container của bạn đã được tiếp nhận và đang chờ sắp xếp vị trí trong bãi.",
                    order.getCustomer().getUserId());
        }
    }

    /** Called by gate-in service when a container is assigned a yard position. */
    @Override
    @Transactional
    public void markStored(String containerId) {
        orderRepository.findActiveOrderByContainerId(containerId, List.of(STATUS_IMPORTED, STATUS_STORED, "DAMAGED", "REPAIRED"))
                .ifPresent(order -> {
                    // Only advance to STORED if not already there
                    if (!STATUS_STORED.equalsIgnoreCase(order.getStatus().getStatusName())) {
                        order.setStatus(resolveStatus(STATUS_STORED));
                        orderRepository.save(order);
                    }
                    log.info("[Order] Container {} positioned → Order #{} → {}", containerId, order.getOrderId(), order.getStatus().getStatusName());
                    if (order.getCustomer() != null) {
                        notificationService.notify(
                                "Container đã vào vị trí — Đơn #" + order.getOrderId(),
                                "Container của bạn đã được sắp xếp vào vị trí trong kho.",
                                order.getCustomer().getUserId());
                    }
                });
    }

    @Override
    @Transactional
    public void markExported(String containerId) {
        orderRepository.findActiveOrderByContainerId(containerId,
                List.of(STATUS_STORED, STATUS_IMPORTED, STATUS_WAITING_CHECKIN, 
                        "EDIT_REQUESTED", "EDIT_APPROVED", "EDIT_REJECTED", "DAMAGED", "REPAIRED"))
                .ifPresent(order -> {
                    order.setStatus(resolveStatus(STATUS_EXPORTED));
                    orderRepository.save(order);
                    log.info("[Order] Container {} gate-out → Order #{} → EXPORTED", containerId, order.getOrderId());
                    if (order.getCustomer() != null) {
                        notificationService.notify(
                                "Container đã xuất kho — Đơn #" + order.getOrderId(),
                                "Container của bạn đã được xuất kho thành công.",
                                order.getCustomer().getUserId());
                    }
                });
    }

    @Override
    @Transactional
    public Order reject(Integer orderId, String reason) {
        Order order = findById(orderId);
        String current = order.getStatus().getStatusName();
        if (!STATUS_PENDING.equalsIgnoreCase(current)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Only PENDING orders can be rejected. Current status: " + current);
        }
        order.setStatus(resolveStatus(STATUS_REJECTED));
        
        // Record reason in cancellation table (reuses the same pattern as cancel)
        if (reason != null && !reason.isBlank()) {
            OrderCancellation record = new OrderCancellation();
            record.setOrder(order);
            record.setReason(reason);
            cancellationRepository.save(record);
        }

        processRefundIfApplicable(order);
        orderRepository.save(order);

        if (order.getCustomer() != null) {
            log.info("[Notification] Sending rejection notification for order #{} to userId={}",
                    orderId, order.getCustomer().getUserId());
            String reasonText = (reason != null && !reason.isBlank()) ? " Lý do: " + reason : "";
            notificationService.notify(
                    "Đơn hàng #" + orderId + " bị từ chối",
                    "Đơn hàng của bạn đã bị từ chối." + reasonText + " Tiền phí đã được hoàn lại vào ví.",
                    order.getCustomer().getUserId());
        } else {
            log.warn("[Notification] Order #{} has no customer — notification skipped", orderId);
        }

        return order;
    }

    @Override
    @Transactional
    public Order approveCancellation(Integer orderId) {
        Order order = findById(orderId);
        String current = order.getStatus().getStatusName();
        if (!STATUS_CANCEL_REQUESTED.equalsIgnoreCase(current)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Only CANCEL_REQUESTED orders can have cancellation approved. Current: " + current);
        }
        order.setStatus(resolveStatus(STATUS_CANCELLED));
        processRefundIfApplicable(order);
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            notificationService.notify(
                    "Yêu cầu hủy đơn #" + orderId + " được chấp thuận",
                    "Yêu cầu hủy đơn hàng của bạn đã được xử lý và xác nhận. Tiền phí đã được hoàn lại vào ví.",
                    order.getCustomer().getUserId());
        }
        return order;
    }

    @Override
    @Transactional
    public Order requestEditExportDate(Integer orderId, Integer customerId, LocalDate newExportDate) {
        Order order = findById(orderId);

        if (customerId != null && order.getCustomer() != null
                && !customerId.equals(order.getCustomer().getUserId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Bạn không có quyền sửa đơn hàng này");
        }

        String current = order.getStatus().getStatusName();
        if (!STATUS_STORED.equalsIgnoreCase(current) && !STATUS_IMPORTED.equalsIgnoreCase(current)
                && !"EDIT_APPROVED".equalsIgnoreCase(current) && !"EDIT_REJECTED".equalsIgnoreCase(current)
                && !"DAMAGED".equalsIgnoreCase(current) && !"REPAIRED".equalsIgnoreCase(current)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Chỉ đơn ở trạng thái Đang lưu kho, hỏng hóc hoặc Đã duyệt/Không duyệt sửa mới được gửi lại yêu cầu.");
        }

        if (newExportDate == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Ngày xuất mới không được trống");
        }
        if (newExportDate.isBefore(LocalDate.now())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Ngày xuất mới không được sớm hơn hôm nay");
        }
        if (order.getImportDate() != null && newExportDate.isBefore(order.getImportDate())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Ngày xuất mới không được sớm hơn ngày nhập kho");
        }

        BigDecimal feeAmount = calculateEditExportFee(order, newExportDate);
        if (feeAmount.compareTo(BigDecimal.ZERO) > 0 && order.getCustomer() != null) {
            walletService.debitWalletForInvoice(
                    order.getCustomer().getUserId(),
                    feeAmount,
                    "Thanh toán phí yêu cầu đổi ngày xuất kho — Đơn #" + orderId);
        }

        order.setRequestedExportDate(newExportDate);
        order.setStatus(resolveStatus("EDIT_REQUESTED"));
        orderRepository.save(order);

        List<Integer> staffIds = userRepository.findUserIdsByRoleNames(List.of("ADMIN", "OPERATOR"));
        if (!staffIds.isEmpty()) {
            notificationService.notify("Yêu cầu sửa đơn #" + orderId, 
                "Khách hàng yêu cầu đổi ngày xuất kho.", staffIds.toArray(new Integer[0]));
        }
        return order;
    }

    @Override
    @Transactional
    public Order approveEditRequest(Integer orderId) {
        Order order = findById(orderId);
        if (!"EDIT_REQUESTED".equalsIgnoreCase(order.getStatus().getStatusName())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Đơn hàng không có yêu cầu sửa");
        }

        LocalDate newDate = order.getRequestedExportDate();
        if (newDate != null) {
            order.setExportDate(newDate);
        }

        order.setStatus(resolveStatus("EDIT_APPROVED"));
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            notificationService.notify("Yêu cầu sửa được duyệt", 
                "Yêu cầu sửa ngày xuất đơn #" + orderId + " đã được duyệt.", 
                order.getCustomer().getUserId());
        }
        return order;
    }

    @Override
    @Transactional
    public Order rejectEditRequest(Integer orderId) {
        Order order = findById(orderId);
        if (!"EDIT_REQUESTED".equalsIgnoreCase(order.getStatus().getStatusName())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Đơn hàng không có yêu cầu sửa");
        }

        BigDecimal feeAmount = calculateEditExportFee(order, order.getRequestedExportDate());
        if (feeAmount.compareTo(BigDecimal.ZERO) > 0 && order.getCustomer() != null) {
            walletService.creditWalletForRefund(
                    order.getCustomer().getUserId(),
                    feeAmount,
                    "Hoàn tiền phí yêu cầu đổi ngày xuất kho bị từ chối — Đơn #" + orderId);
        }

        order.setStatus(resolveStatus("EDIT_REJECTED"));
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            notificationService.notify("Yêu cầu sửa bị từ chối", 
                "Yêu cầu sửa ngày xuất đơn #" + orderId + " bị từ chối."
                + (feeAmount.compareTo(BigDecimal.ZERO) > 0 ? " Số tiền " + feeAmount + " VND đã được hoàn lại vào ví." : ""), 
                order.getCustomer().getUserId());
        }
        return order;
    }

    private BigDecimal calculateEditExportFee(Order order, LocalDate newExportDate) {
        LocalDate originalExport = order.getExportDate();
        if (originalExport == null || newExportDate == null) return BigDecimal.ZERO;

        long dayDiff = ChronoUnit.DAYS.between(originalExport, newExportDate);
        String changeType = dayDiff > 0 ? "LATE" : (dayDiff < 0 ? "EARLY" : "SAME");

        List<Tariff> tariffs = tariffRepository.findAll();
        int containerCount = Math.max(1, order.getContainers().size());

        BigDecimal feeAmount = BigDecimal.ZERO;
        if (changeType.equals("LATE")) {
            feeAmount = resolveLateFee(tariffs, dayDiff).multiply(BigDecimal.valueOf(dayDiff)).multiply(BigDecimal.valueOf(containerCount));
        } else if (changeType.equals("EARLY")) {
            long earlyDays = Math.abs(dayDiff);
            feeAmount = resolveEarlyFee(tariffs, earlyDays).multiply(BigDecimal.valueOf(containerCount));
        }
        return feeAmount.setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    @Transactional
    public Order adminCancel(Integer orderId, String reason) {
        Order order = findById(orderId);
        String current = order.getStatus().getStatusName();
        if (STATUS_CANCELLED.equalsIgnoreCase(current)) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CANCEL, "Order is already cancelled");
        }
        order.setStatus(resolveStatus(STATUS_CANCELLED));
        if (reason != null && !reason.isBlank()) {
            OrderCancellation record = new OrderCancellation();
            record.setOrder(order);
            record.setReason(reason);
            cancellationRepository.save(record);
        }
        processRefundIfApplicable(order);
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            notificationService.notify(
                    "Đơn hàng #" + orderId + " đã bị hủy",
                    "Đơn hàng của bạn đã bị hủy bởi nhân viên." + (reason != null ? " Lý do: " + reason : "") + " Tiền phí đã được hoàn lại vào ví.",
                    order.getCustomer().getUserId());
        }
        return order;
    }

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

    private BigDecimal resolveEarlyFee(List<Tariff> tariffs, long earlyDays) {
        for (Tariff t : tariffs) {
            if (!"EARLY_FEE".equals(t.getFeeType())) continue;
            String code = t.getTariffCode();
            if ("EARLY_FEE_1".equals(code) && earlyDays == 1) return t.getUnitPrice();
            if ("EARLY_FEE_2_3".equals(code) && earlyDays >= 2 && earlyDays <= 3) return t.getUnitPrice();
            if ("EARLY_FEE_GT_3".equals(code) && earlyDays > 3) return t.getUnitPrice();
        }
        return BigDecimal.ZERO;
    }

    @Override
    public Order findOrderByContainerId(String containerId) {
        List<String> activeStatuses = List.of(
                STATUS_PENDING, STATUS_APPROVED, STATUS_CANCEL_REQUESTED,
                STATUS_WAITING_CHECKIN, STATUS_LATE_CHECKIN, STATUS_READY_FOR_IMPORT,
                STATUS_IMPORTED, STATUS_STORED, "EDIT_REQUESTED", "EDIT_APPROVED", "EDIT_REJECTED", "DAMAGED", "REPAIRED");
        return orderRepository.findActiveOrderByContainerId(containerId, activeStatuses)
                .map(Order::getOrderId)
                .flatMap(orderRepository::findByIdWithDetails)
                .orElse(null);
    }

    @Override
    @Transactional
    public OrderExportDateFeeResponse changeExportDate(Integer orderId, Integer customerId,
                                                       OrderExportDateUpdateRequest request) {
        Order order = findById(orderId);

        // Authorization: only the order's owner (or admin/operator at the controller layer)
        if (customerId != null && order.getCustomer() != null
                && !customerId.equals(order.getCustomer().getUserId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Bạn không có quyền sửa đơn hàng này");
        }

        String current = order.getStatus().getStatusName();
        if (!STATUS_STORED.equalsIgnoreCase(current) && !STATUS_IMPORTED.equalsIgnoreCase(current)
                && !"EDIT_APPROVED".equalsIgnoreCase(current) && !"EDIT_REJECTED".equalsIgnoreCase(current)
                && !"DAMAGED".equalsIgnoreCase(current) && !"REPAIRED".equalsIgnoreCase(current)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Chỉ đơn ở trạng thái Đang lưu kho, hỏng hóc hoặc đã duyệt sửa mới được sửa ngày xuất. Trạng thái hiện tại: " + current);
        }

        LocalDate today = LocalDate.now();
        LocalDate newDate = request.getNewExportDate();
        if (newDate == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Ngày xuất mới không được trống");
        }
        if (newDate.isBefore(today)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Ngày xuất mới không được sớm hơn hôm nay");
        }
        if (order.getImportDate() != null && newDate.isBefore(order.getImportDate())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Ngày xuất mới không được sớm hơn ngày nhập kho (" + order.getImportDate() + ")");
        }

        LocalDate originalExport = order.getExportDate();
        long dayDiff = (originalExport != null)
                ? ChronoUnit.DAYS.between(originalExport, newDate)
                : 0L;
        String changeType = dayDiff > 0 ? "LATE" : (dayDiff < 0 ? "EARLY" : "SAME");

        List<Tariff> tariffs = tariffRepository.findAll();
        int containerCount = Math.max(1, order.getContainers().size());

        BigDecimal feeAmount = BigDecimal.ZERO;
        if (changeType.equals("LATE")) {
            feeAmount = resolveLateFee(tariffs, dayDiff).multiply(BigDecimal.valueOf(dayDiff)).multiply(BigDecimal.valueOf(containerCount));
        } else if (changeType.equals("EARLY")) {
            long earlyDays = Math.abs(dayDiff);
            feeAmount = resolveEarlyFee(tariffs, earlyDays).multiply(BigDecimal.valueOf(containerCount));
        }
        feeAmount = feeAmount.setScale(2, RoundingMode.HALF_UP);

        boolean confirm = Boolean.TRUE.equals(request.getConfirmPayment());
        BigDecimal balanceAfter = null;

        if (confirm) {
            if (feeAmount.compareTo(BigDecimal.ZERO) > 0) {
                if (order.getCustomer() == null) {
                    throw new BusinessException(ErrorCode.BAD_REQUEST,
                            "Đơn hàng không có chủ tài khoản — không thể trừ ví");
                }
                Wallet wallet = walletService.debitWalletForInvoice(
                        order.getCustomer().getUserId(),
                        feeAmount,
                        "Phí thay đổi ngày xuất — Đơn #" + orderId);
                balanceAfter = wallet.getBalance();
            } else if (order.getCustomer() != null) {
                balanceAfter = walletService.getByUserId(order.getCustomer().getUserId()).getBalance();
            }

            order.setExportDate(newDate);
            orderRepository.save(order);

            if (order.getCustomer() != null) {
                notificationService.notify(
                        "Đã đổi ngày xuất — Đơn #" + orderId,
                        "Ngày xuất mới: " + newDate
                                + (feeAmount.compareTo(BigDecimal.ZERO) > 0
                                    ? ". Phí: " + feeAmount + " VND" : ""),
                        order.getCustomer().getUserId());
            }
        }

        return OrderExportDateFeeResponse.builder()
                .orderId(orderId)
                .currentExportDate(originalExport)
                .newExportDate(newDate)
                .dayDiff(dayDiff)
                .changeType(changeType)
                .fee(feeAmount)
                .freeStorageDays(0)
                .walletBalanceAfter(balanceAfter)
                .charged(confirm)
                .currency("VND")
                .build();
    }

    // ----------------------------------------------------------------

    private OrderStatus resolveStatus(String name) {
        return orderStatusRepository.findByStatusNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BAD_REQUEST,
                        "Order status not found: " + name));
    }
}

package com.anhnht.warehouse.service.modules.booking.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import com.anhnht.warehouse.service.modules.billing.repository.FeeConfigRepository;
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
            List.of(STATUS_CANCELLED, STATUS_REJECTED, STATUS_EXPORTED);

    private final OrderRepository            orderRepository;
    private final OrderStatusRepository      orderStatusRepository;
    private final OrderCancellationRepository cancellationRepository;
    private final ContainerRepository        containerRepository;
    private final UserRepository             userRepository;
    private final NotificationService        notificationService;
    private final FeeConfigRepository        feeConfigRepository;
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
        return orderRepository.save(order);
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

        orderRepository.save(order);

        if (STATUS_CANCEL_REQUESTED.equals(targetStatus)) {
            // Notify admin/operator that customer wants to cancel
            List<Integer> staffIds = userRepository.findUserIdsByRoleNames(List.of("ADMIN", "OPERATOR"));
            if (!staffIds.isEmpty()) {
                notificationService.notify(
                        "Yêu cầu hủy đơn #" + orderId,
                        "Khách hàng " + order.getCustomerName() + " yêu cầu hủy đơn hàng. Vui lòng xem xét và xử lý.",
                        staffIds.toArray(new Integer[0]));
            }
        }

        return order;
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
                        STATUS_IMPORTED, STATUS_STORED))
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
        orderRepository.findActiveOrderByContainerId(containerId, List.of(STATUS_IMPORTED, STATUS_STORED))
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

    /** Called by gate-out service when a container leaves the yard. */
    @Override
    @Transactional
    public void markExported(String containerId) {
        orderRepository.findActiveOrderByContainerId(containerId,
                List.of(STATUS_STORED, STATUS_IMPORTED, STATUS_WAITING_CHECKIN))
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
        orderRepository.save(order);

        // Record reason in cancellation table (reuses the same pattern as cancel)
        if (reason != null && !reason.isBlank()) {
            OrderCancellation record = new OrderCancellation();
            record.setOrder(order);
            record.setReason(reason);
            cancellationRepository.save(record);
        }

        if (order.getCustomer() != null) {
            log.info("[Notification] Sending rejection notification for order #{} to userId={}",
                    orderId, order.getCustomer().getUserId());
            String reasonText = (reason != null && !reason.isBlank()) ? " Lý do: " + reason : "";
            notificationService.notify(
                    "Đơn hàng #" + orderId + " bị từ chối",
                    "Đơn hàng của bạn đã bị từ chối." + reasonText,
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
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            notificationService.notify(
                    "Yêu cầu hủy đơn #" + orderId + " được chấp thuận",
                    "Yêu cầu hủy đơn hàng của bạn đã được xử lý và xác nhận.",
                    order.getCustomer().getUserId());
        }
        return order;
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
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            notificationService.notify(
                    "Đơn hàng #" + orderId + " đã bị hủy",
                    "Đơn hàng của bạn đã bị hủy bởi nhân viên." + (reason != null ? " Lý do: " + reason : ""),
                    order.getCustomer().getUserId());
        }
        return order;
    }

    @Override
    public Order findOrderByContainerId(String containerId) {
        List<String> activeStatuses = List.of(
                STATUS_PENDING, STATUS_APPROVED, STATUS_CANCEL_REQUESTED,
                STATUS_WAITING_CHECKIN, STATUS_LATE_CHECKIN, STATUS_READY_FOR_IMPORT,
                STATUS_IMPORTED, STATUS_STORED);
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
        if (!STATUS_STORED.equalsIgnoreCase(current) && !STATUS_IMPORTED.equalsIgnoreCase(current)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED,
                    "Chỉ đơn ở trạng thái Đang lưu kho mới được sửa ngày xuất. Trạng thái hiện tại: " + current);
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

        FeeConfig fee = feeConfigRepository.findAll().stream().findFirst()
                .orElse(new FeeConfig());

        // Per-day daily storage rate (used as the late fee per day): 20ft rate × storageMultiplier.
        // Falls back to ratePerKgDefault when 20ft rate is not configured.
        BigDecimal dailyRate = fee.getContainerRate20ft() != null
                && fee.getContainerRate20ft().compareTo(BigDecimal.ZERO) > 0
                ? fee.getContainerRate20ft()
                : (fee.getRatePerKgDefault() != null ? fee.getRatePerKgDefault() : BigDecimal.ZERO);
        if (fee.getStorageMultiplier() != null) {
            dailyRate = dailyRate.multiply(fee.getStorageMultiplier());
        }
        // Multiply by overdue penalty rate when picking up later than originally promised.
        BigDecimal lateFeePerDay = dailyRate;
        if (fee.getOverduePenaltyRate() != null
                && fee.getOverduePenaltyRate().compareTo(BigDecimal.ZERO) > 0) {
            lateFeePerDay = dailyRate.multiply(BigDecimal.ONE.add(fee.getOverduePenaltyRate()));
        }

        BigDecimal feeAmount;
        if (changeType.equals("LATE")) {
            feeAmount = lateFeePerDay.multiply(BigDecimal.valueOf(dayDiff));
        } else if (changeType.equals("EARLY")) {
            BigDecimal early = fee.getEarlyPickupFee() != null
                    ? fee.getEarlyPickupFee()
                    : BigDecimal.ZERO;
            // Charge a one-time early-pickup fee, regardless of how many days early.
            feeAmount = early;
        } else {
            feeAmount = BigDecimal.ZERO;
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
                                    ? ". Phí: " + feeAmount + " " + fee.getCurrency() : ""),
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
                .freeStorageDays(fee.getFreeStorageDays())
                .walletBalanceAfter(balanceAfter)
                .charged(confirm)
                .currency(fee.getCurrency() != null ? fee.getCurrency() : "VND")
                .build();
    }

    // ----------------------------------------------------------------

    private OrderStatus resolveStatus(String name) {
        return orderStatusRepository.findByStatusNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BAD_REQUEST,
                        "Order status not found: " + name));
    }
}

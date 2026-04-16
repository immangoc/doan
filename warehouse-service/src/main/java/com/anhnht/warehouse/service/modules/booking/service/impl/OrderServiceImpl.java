package com.anhnht.warehouse.service.modules.booking.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderCancelRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderStatusUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderUpdateRequest;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private static final String STATUS_IMPORTED          = "IMPORTED";
    private static final String STATUS_STORED            = "STORED";
    private static final String STATUS_EXPORTED          = "EXPORTED";

    private final OrderRepository            orderRepository;
    private final OrderStatusRepository      orderStatusRepository;
    private final OrderCancellationRepository cancellationRepository;
    private final ContainerRepository        containerRepository;
    private final UserRepository             userRepository;
    private final NotificationService        notificationService;

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
        }

        // Optionally link containers at creation time
        if (request.getContainerIds() != null) {
            for (String cid : request.getContainerIds()) {
                Container container = containerRepository.findById(cid)
                        .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                                "Container not found: " + cid));
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
        orderRepository.findActiveOrderByContainerId(containerId,
                List.of(STATUS_WAITING_CHECKIN, STATUS_LATE_CHECKIN, STATUS_APPROVED))
                .ifPresent(order -> {
                    order.setStatus(resolveStatus(STATUS_IMPORTED));
                    orderRepository.save(order);
                    log.info("[Order] Container {} gate-in → Order #{} → IMPORTED", containerId, order.getOrderId());
                    if (order.getCustomer() != null) {
                        notificationService.notify(
                                "Container đã nhập kho — Đơn #" + order.getOrderId(),
                                "Container của bạn đã được tiếp nhận và đang chờ sắp xếp vị trí trong bãi.",
                                order.getCustomer().getUserId());
                    }
                });
    }

    /** Called by gate-in service when a container is assigned a yard position. */
    @Override
    @Transactional
    public void markStored(String containerId) {
        orderRepository.findActiveOrderByContainerId(containerId, List.of(STATUS_IMPORTED))
                .ifPresent(order -> {
                    order.setStatus(resolveStatus(STATUS_STORED));
                    orderRepository.save(order);
                    log.info("[Order] Container {} positioned → Order #{} → STORED", containerId, order.getOrderId());
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

    // ----------------------------------------------------------------

    private OrderStatus resolveStatus(String name) {
        return orderStatusRepository.findByStatusNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BAD_REQUEST,
                        "Order status not found: " + name));
    }
}

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

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final String STATUS_PENDING    = "PENDING";
    private static final String STATUS_APPROVED   = "APPROVED";
    private static final String STATUS_REJECTED   = "REJECTED";
    private static final String STATUS_CANCELLED  = "CANCELLED";

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

        return orderRepository.save(order);
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
        if (STATUS_CANCELLED.equalsIgnoreCase(currentStatus)) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CANCEL,
                    "Order is already cancelled");
        }
        // Only PENDING orders can be cancelled by customer; admin can cancel any non-completed
        if ("COMPLETED".equalsIgnoreCase(currentStatus)) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CANCEL,
                    "Completed orders cannot be cancelled");
        }

        OrderStatus cancelled = resolveStatus(STATUS_CANCELLED);
        order.setStatus(cancelled);

        OrderCancellation cancellation = new OrderCancellation();
        cancellation.setOrder(order);
        cancellation.setReason(request.getReason());
        cancellationRepository.save(cancellation);

        return orderRepository.save(order);
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
        order.setStatus(resolveStatus(STATUS_APPROVED));
        orderRepository.save(order);
        if (order.getCustomer() != null) {
            log.info("[Notification] Sending approval notification for order #{} to userId={}",
                    orderId, order.getCustomer().getUserId());
            notificationService.notify(
                    "Đơn hàng #" + orderId + " đã được duyệt",
                    "Đơn hàng của bạn đã được xem xét và chấp thuận.",
                    order.getCustomer().getUserId());
        } else {
            log.warn("[Notification] Order #{} has no customer — notification skipped", orderId);
        }
        return order;
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

    // ----------------------------------------------------------------

    private OrderStatus resolveStatus(String name) {
        return orderStatusRepository.findByStatusNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BAD_REQUEST,
                        "Order status not found: " + name));
    }
}

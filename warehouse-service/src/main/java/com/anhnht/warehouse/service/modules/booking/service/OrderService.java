package com.anhnht.warehouse.service.modules.booking.service;

import com.anhnht.warehouse.service.modules.booking.dto.request.OrderCancelRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderStatusUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrderService {

    /** Admin/Operator: pageable list with optional status + keyword filter. */
    Page<Order> findAll(String statusName, String keyword, Pageable pageable);

    /** Customer: view own orders. */
    Page<Order> findMyOrders(Integer customerId, Pageable pageable);

    Order findById(Integer orderId);

    /** Customer creates a new booking (status = PENDING). */
    Order create(Integer customerId, OrderRequest request);

    /** Customer or Admin edits contact fields on a PENDING order. */
    Order update(Integer orderId, OrderUpdateRequest request);

    /** Admin/Operator updates order status. */
    Order updateStatus(Integer orderId, OrderStatusUpdateRequest request);

    /** Customer or Admin cancels an order. */
    Order cancel(Integer orderId, OrderCancelRequest request);

    /** Admin links a container to an order. */
    Order addContainer(Integer orderId, String containerId);

    /** Admin removes a container from an order. */
    Order removeContainer(Integer orderId, String containerId);

    /**
     * Admin/Operator approves a PENDING order → APPROVED.
     * Throws BusinessException if order is not in PENDING status.
     */
    Order approve(Integer orderId);

    /**
     * Admin/Operator rejects a PENDING order → REJECTED.
     * Throws BusinessException if order is not in PENDING status.
     *
     * @param reason optional rejection reason stored in a cancellation record
     */
    Order reject(Integer orderId, String reason);
}

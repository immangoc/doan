package com.anhnht.warehouse.service.modules.booking.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.PageableUtils;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderCancelRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderStatusUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.OrderUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.response.OrderResponse;
import com.anhnht.warehouse.service.modules.booking.mapper.BookingMapper;
import com.anhnht.warehouse.service.modules.booking.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService  orderService;
    private final BookingMapper bookingMapper;

    // ============================================================
    // Customer endpoints
    // ============================================================

    @PostMapping("/orders")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody OrderRequest request) {
        Integer customerId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(201).body(ApiResponse.created(
                bookingMapper.toOrderResponse(orderService.create(customerId, request))));
    }

    @GetMapping("/orders/my")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getMyOrders(
            @RequestParam(defaultValue = "0")         int page,
            @RequestParam(defaultValue = "20")        int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc")      String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        Integer customerId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(orderService.findMyOrders(customerId, pageable)
                        .map(bookingMapper::toOrderResponse))));
    }

    @GetMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.findById(id))));
    }

    @PutMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrder(
            @PathVariable Integer id,
            @Valid @RequestBody OrderUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.update(id, request))));
    }

    @PutMapping("/orders/{id}/cancel")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Integer id,
            @Valid @RequestBody OrderCancelRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.cancel(id, request))));
    }

    // ============================================================
    // Admin / Operator endpoints
    // ============================================================

    @GetMapping("/admin/orders")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getAllOrders(
            @RequestParam(required = false)           String statusName,
            @RequestParam(required = false)           String keyword,
            @RequestParam(defaultValue = "0")         int page,
            @RequestParam(defaultValue = "20")        int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc")      String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(orderService.findAll(statusName, keyword, pageable)
                        .map(bookingMapper::toOrderResponse))));
    }

    @GetMapping("/admin/orders/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderAdmin(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.findById(id))));
    }

    @GetMapping("/admin/orders/by-container/{containerId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderByContainer(@PathVariable String containerId) {
        var order = orderService.findOrderByContainerId(containerId);
        return ResponseEntity.ok(ApiResponse.success(
                order != null ? bookingMapper.toOrderResponse(order) : null));
    }

    @PutMapping("/admin/orders/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Integer id,
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.updateStatus(id, request))));
    }

    /**
     * PUT /admin/orders/{id}/approve
     * Approves a PENDING order → APPROVED.
     */
    @PutMapping("/admin/orders/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> approveOrder(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.approve(id))));
    }

    /**
     * PUT /admin/orders/{id}/reject
     * Rejects a PENDING order → REJECTED. Optional reason in body.
     */
    @PutMapping("/admin/orders/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> rejectOrder(
            @PathVariable Integer id,
            @RequestBody(required = false) OrderCancelRequest request) {
        String reason = (request != null) ? request.getReason() : null;
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.reject(id, reason))));
    }

    /**
     * PUT /admin/orders/{id}/approve-cancel
     * Approves a customer's CANCEL_REQUESTED → CANCELLED.
     */
    @PutMapping("/admin/orders/{id}/approve-cancel")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> approveCancellation(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.approveCancellation(id))));
    }

    /**
     * PUT /admin/orders/{id}/cancel
     * Admin force-cancels any non-cancelled order.
     */
    @PutMapping("/admin/orders/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> adminCancelOrder(
            @PathVariable Integer id,
            @RequestBody(required = false) OrderCancelRequest request) {
        String reason = (request != null) ? request.getReason() : null;
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.adminCancel(id, reason))));
    }

    @PostMapping("/admin/orders/{orderId}/containers/{containerId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> addContainer(
            @PathVariable Integer orderId,
            @PathVariable String containerId) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.addContainer(orderId, containerId))));
    }

    @DeleteMapping("/admin/orders/{orderId}/containers/{containerId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<OrderResponse>> removeContainer(
            @PathVariable Integer orderId,
            @PathVariable String containerId) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toOrderResponse(orderService.removeContainer(orderId, containerId))));
    }
}

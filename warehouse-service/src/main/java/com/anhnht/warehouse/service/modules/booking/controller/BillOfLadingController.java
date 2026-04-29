package com.anhnht.warehouse.service.modules.booking.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.booking.dto.request.BillOfLadingRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.BillStatusUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.dto.response.BillHistoryResponse;
import com.anhnht.warehouse.service.modules.booking.dto.response.BillOfLadingResponse;
import com.anhnht.warehouse.service.modules.booking.mapper.BookingMapper;
import com.anhnht.warehouse.service.modules.booking.service.BillOfLadingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Vận đơn", description = "Quản lý vận đơn (Bill of Lading)")
@RestController
@RequiredArgsConstructor
public class BillOfLadingController {

    private final BillOfLadingService billService;
    private final BookingMapper       bookingMapper;

    // ============================================================
    // Customer: view own BoL
    // ============================================================

    @GetMapping("/orders/{orderId}/bill")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<BillOfLadingResponse>> getBillForOrder(
            @PathVariable Integer orderId) {
        var bill = billService.findByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.success(
                bill != null ? bookingMapper.toBillResponse(bill) : null));
    }

    // ============================================================
    // Admin / Operator
    // ============================================================

    @GetMapping("/admin/bills/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<BillOfLadingResponse>> getBill(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toBillResponse(billService.findById(id))));
    }

    @PostMapping("/admin/orders/{orderId}/bill")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<BillOfLadingResponse>> createBill(
            @PathVariable Integer orderId,
            @Valid @RequestBody BillOfLadingRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                bookingMapper.toBillResponse(billService.create(orderId, request))));
    }

    @PutMapping("/admin/bills/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<BillOfLadingResponse>> updateBillStatus(
            @PathVariable Integer id,
            @Valid @RequestBody BillStatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toBillResponse(billService.updateStatus(id, request))));
    }

    @GetMapping("/admin/bills/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<BillHistoryResponse>>> getBillHistory(
            @PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingMapper.toBillHistoryResponses(billService.getHistory(id))));
    }
}

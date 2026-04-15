package com.anhnht.warehouse.service.modules.gateout.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.PageableUtils;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.gateout.dto.request.GateOutRequest;
import com.anhnht.warehouse.service.modules.gateout.dto.response.GateOutReceiptResponse;
import com.anhnht.warehouse.service.modules.gateout.dto.response.StorageBillResponse;
import com.anhnht.warehouse.service.modules.gateout.dto.response.StorageInvoiceResponse;
import com.anhnht.warehouse.service.modules.gateout.mapper.GateOutMapper;
import com.anhnht.warehouse.service.modules.gateout.service.GateOutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class GateOutController {

    private final GateOutService gateOutService;
    private final GateOutMapper  gateOutMapper;

    // ============================================================
    // Gate-Out
    // ============================================================

    @PostMapping("/gate-out")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<GateOutReceiptResponse>> processGateOut(
            @Valid @RequestBody GateOutRequest request) {
        Integer operatorId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(201).body(ApiResponse.created(
                gateOutMapper.toResponse(gateOutService.processGateOut(operatorId, request))));
    }

    @GetMapping("/gate-out")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<GateOutReceiptResponse>>> getGateOutReceipts(
            @RequestParam(defaultValue = "0")           int page,
            @RequestParam(defaultValue = "20")          int size,
            @RequestParam(defaultValue = "gateOutTime") String sortBy,
            @RequestParam(defaultValue = "desc")        String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(gateOutService.findAll(pageable)
                        .map(gateOutMapper::toResponse))));
    }

    @GetMapping("/gate-out/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<GateOutReceiptResponse>> getGateOutReceipt(
            @PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                gateOutMapper.toResponse(gateOutService.findById(id))));
    }

    @GetMapping("/gate-out/{id}/invoice")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<StorageInvoiceResponse>> getInvoice(
            @PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(gateOutService.getInvoice(id)));
    }

    // ============================================================
    // Billing — computed storage fee (not persisted)
    // ============================================================

    @GetMapping("/containers/{containerId}/storage-bill")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<StorageBillResponse>> getStorageBill(
            @PathVariable String containerId) {
        return ResponseEntity.ok(ApiResponse.success(
                gateOutService.computeStorageBill(containerId)));
    }
}

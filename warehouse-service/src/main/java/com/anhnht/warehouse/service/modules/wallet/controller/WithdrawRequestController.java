package com.anhnht.warehouse.service.modules.wallet.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.wallet.dto.request.ApproveWithdrawRequestDto;
import com.anhnht.warehouse.service.modules.wallet.dto.request.CreateWithdrawRequestDto;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WithdrawRequestListResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WithdrawRequestResponse;
import com.anhnht.warehouse.service.modules.wallet.service.WithdrawRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Yêu cầu rút tiền", description = "Quản lý yêu cầu rút tiền")
@RestController
@RequestMapping("/wallet/withdraw-requests")
@RequiredArgsConstructor
public class WithdrawRequestController {

    private final WithdrawRequestService withdrawRequestService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<WithdrawRequestResponse>> create(
            @Valid @RequestBody CreateWithdrawRequestDto request) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.created(
                withdrawRequestService.create(userId, request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<WithdrawRequestListResponse>> listAll() {
        return ResponseEntity.ok(ApiResponse.success(withdrawRequestService.listAll()));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<WithdrawRequestResponse>> approve(
            @PathVariable("id") UUID id,
            @Valid @RequestBody ApproveWithdrawRequestDto request) {
        Integer adminId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                withdrawRequestService.approve(adminId, id, request)));
    }
}

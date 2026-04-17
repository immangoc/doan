package com.anhnht.warehouse.service.modules.wallet.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.wallet.dto.request.CreateTopupRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.request.PayOSWebhookRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentLinkResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentStatusResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WalletBalanceResponse;
import com.anhnht.warehouse.service.modules.wallet.entity.Wallet;
import com.anhnht.warehouse.service.modules.wallet.service.WalletPaymentService;
import com.anhnht.warehouse.service.modules.wallet.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService        walletService;
    private final WalletPaymentService walletPaymentService;

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<WalletBalanceResponse>> getMyWallet() {
        Integer userId = SecurityUtils.getCurrentUserId();
        Wallet wallet = walletService.getByUserId(userId);

        WalletBalanceResponse response = new WalletBalanceResponse();
        response.setWalletId(wallet.getWalletId());
        response.setBalance(wallet.getBalance());
        response.setUpdatedAt(wallet.getUpdatedAt());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/topup")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PaymentLinkResponse>> createTopupLink(
            @Valid @RequestBody CreateTopupRequest request) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                walletPaymentService.createTopupLink(userId, request)));
    }

    @GetMapping("/topup/{orderCode}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PaymentStatusResponse>> getTopupStatus(
            @PathVariable Long orderCode) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                walletPaymentService.getTopupStatus(userId, orderCode)));
    }

    @PostMapping("/topup/{orderCode}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> cancelTopup(@PathVariable Long orderCode) {
        Integer userId = SecurityUtils.getCurrentUserId();
        walletPaymentService.cancelTopup(userId, orderCode);
        return ResponseEntity.ok(ApiResponse.noContent("Topup cancelled"));
    }

    @PostMapping("/payos/webhook")
    public ResponseEntity<ApiResponse<Void>> payosWebhook(@RequestBody PayOSWebhookRequest webhook) {
        walletPaymentService.processWebhook(webhook);
        return ResponseEntity.ok(ApiResponse.noContent("Webhook processed"));
    }
}

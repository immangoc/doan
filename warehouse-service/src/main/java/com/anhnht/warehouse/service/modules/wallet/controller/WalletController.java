package com.anhnht.warehouse.service.modules.wallet.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.PageableUtils;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.wallet.dto.request.CreateTopupRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.request.PayOSWebhookRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentLinkResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentStatusResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WalletBalanceResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WalletTransactionResponse;
import com.anhnht.warehouse.service.modules.wallet.entity.Payment;
import com.anhnht.warehouse.service.modules.wallet.entity.Wallet;
import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransaction;
import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransactionType;
import com.anhnht.warehouse.service.modules.wallet.repository.WalletTransactionRepository;
import com.anhnht.warehouse.service.modules.wallet.service.WalletPaymentService;
import com.anhnht.warehouse.service.modules.wallet.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Ví điện tử", description = "Quản lý ví và nạp tiền")
@RestController
@RequestMapping("/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService               walletService;
    private final WalletPaymentService        walletPaymentService;
    private final WalletTransactionRepository walletTransactionRepository;

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

    @GetMapping("/me/transactions")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<WalletTransactionResponse>>> getMyTransactions(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        Integer userId = SecurityUtils.getCurrentUserId();
        Wallet wallet = walletService.getByUserId(userId);

        Pageable pageable = PageableUtils.of(page, size, "createdAt", "desc");
        Page<WalletTransaction> txPage = walletTransactionRepository
                .findByWalletWalletIdOrderByCreatedAtDesc(wallet.getWalletId(), pageable);

        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(txPage.map(this::toResponse))));
    }

    @GetMapping("/me/topup-count")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<Long>> getMyTopupCount() {
        Integer userId = SecurityUtils.getCurrentUserId();
        Wallet wallet = walletService.getByUserId(userId);
        long count = walletTransactionRepository.countByWalletWalletIdAndType(
                wallet.getWalletId(), WalletTransactionType.TOPUP);
        return ResponseEntity.ok(ApiResponse.success(count));
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

    private WalletTransactionResponse toResponse(WalletTransaction tx) {
        WalletTransactionResponse r = new WalletTransactionResponse();
        r.setTransactionId(tx.getTransactionId());
        r.setType(tx.getType());
        r.setAmount(tx.getAmount());
        r.setBalanceAfter(tx.getBalanceAfter());
        r.setNote(tx.getNote());
        r.setCreatedAt(tx.getCreatedAt());
        Payment p = tx.getPayment();
        if (p != null) {
            r.setPaymentOrderCode(p.getPayosOrderCode());
            r.setPaymentStatus(p.getStatus() != null ? p.getStatus().name() : null);
        }
        return r;
    }
}

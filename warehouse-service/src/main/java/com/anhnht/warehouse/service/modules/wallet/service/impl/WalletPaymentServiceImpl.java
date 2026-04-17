package com.anhnht.warehouse.service.modules.wallet.service.impl;

import com.anhnht.warehouse.service.common.config.PayOSConfig;
import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.wallet.dto.request.CreateTopupRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.request.PayOSWebhookRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PayOSLinkResult;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PayOSPaymentStatus;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentLinkResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentStatusResponse;
import com.anhnht.warehouse.service.modules.wallet.entity.Payment;
import com.anhnht.warehouse.service.modules.wallet.entity.PaymentStatus;
import com.anhnht.warehouse.service.modules.wallet.repository.PaymentRepository;
import com.anhnht.warehouse.service.modules.wallet.service.PayOSService;
import com.anhnht.warehouse.service.modules.wallet.service.WalletPaymentService;
import com.anhnht.warehouse.service.modules.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WalletPaymentServiceImpl implements WalletPaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository    userRepository;
    private final WalletService     walletService;
    private final PayOSService      payOSService;
    private final PayOSConfig       payOSConfig;

    @Override
    @Transactional
    public PaymentLinkResponse createTopupLink(Integer userId, CreateTopupRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(ErrorCode.PAYMENT_AMOUNT_INVALID, "Amount must be positive");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));
        walletService.createWalletForUser(userId);

        long orderCode = generateUniqueOrderCode();
        String description = request.getDescription() != null
                ? request.getDescription()
                : "Nap vi #" + userId;
        // PayOS limits description to 25 characters
        if (description.length() > 25) {
            description = description.substring(0, 25);
        }
        String returnUrl = request.getReturnUrl() != null ? request.getReturnUrl() : payOSConfig.getReturnUrl();
        String cancelUrl = request.getCancelUrl() != null ? request.getCancelUrl() : payOSConfig.getCancelUrl();

        Payment payment = new Payment();
        payment.setUser(user);
        payment.setAmount(request.getAmount());
        payment.setPayosOrderCode(orderCode);
        payment.setStatus(PaymentStatus.PENDING);
        payment = paymentRepository.save(payment);

        PayOSLinkResult link = payOSService.createPaymentLink(user, orderCode, request.getAmount(),
                description, returnUrl, cancelUrl);

        payment.setPayosPaymentLinkId(link.getPaymentLinkId());
        payment.setResponseData(link.getRawResponse());
        paymentRepository.save(payment);

        PaymentLinkResponse response = new PaymentLinkResponse();
        response.setPaymentId(payment.getPaymentId());
        response.setOrderCode(orderCode);
        response.setPaymentLinkId(link.getPaymentLinkId());
        response.setAmount(payment.getAmount());
        response.setCheckoutUrl(link.getCheckoutUrl());
        response.setQrCode(link.getQrCode());
        response.setStatus(payment.getStatus().name());
        response.setCreatedAt(payment.getCreatedAt());
        response.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        return response;
    }

    @Override
    @Transactional
    public PaymentStatusResponse getTopupStatus(Integer userId, Long orderCode) {
        Payment payment = paymentRepository.findByPayosOrderCodeAndUserUserId(orderCode, userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PAYMENT_NOT_FOUND));

        PayOSPaymentStatus status = payOSService.getPaymentStatus(orderCode);
        payment.setResponseData(status.getRawResponse());

        PaymentStatus mapped = mapStatus(status.getStatus());
        if (mapped == PaymentStatus.SUCCESS) {
            handlePaidPayment(payment, status.getAmount());
        } else if (mapped == PaymentStatus.CANCELLED || mapped == PaymentStatus.FAILED) {
            payment.setStatus(mapped);
            paymentRepository.save(payment);
        } else {
            paymentRepository.save(payment);
        }

        PaymentStatusResponse response = new PaymentStatusResponse();
        response.setPaymentId(payment.getPaymentId());
        response.setOrderCode(orderCode);
        response.setAmount(payment.getAmount());
        response.setStatus(payment.getStatus().name());
        response.setPaidAt(payment.getPaidAt());
        return response;
    }

    @Override
    @Transactional
    public void cancelTopup(Integer userId, Long orderCode) {
        Payment payment = paymentRepository.findByPayosOrderCodeAndUserUserId(orderCode, userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_PROCESSED, "Payment already completed");
        }

        payOSService.cancelPaymentLink(orderCode);
        payment.setStatus(PaymentStatus.CANCELLED);
        paymentRepository.save(payment);
    }

    @Override
    @Transactional
    public void processWebhook(PayOSWebhookRequest webhook) {
        if (!payOSService.verifyWebhookSignature(webhook)) {
            throw new BusinessException(ErrorCode.WEBHOOK_SIGNATURE_INVALID, "Invalid webhook signature");
        }

        Long orderCode = webhook.getData() != null ? webhook.getData().getOrderCode() : null;
        if (orderCode == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Missing orderCode in webhook");
        }

        Payment payment = paymentRepository.findByPayosOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PAYMENT_NOT_FOUND));

        if ("00".equals(webhook.getCode())) {
            Integer amount = webhook.getData() != null ? webhook.getData().getAmount() : null;
            handlePaidPayment(payment, amount);
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
        }
    }

    // ------------------------------------------------------

    private void handlePaidPayment(Payment payment, Integer amountFromGateway) {
        if (payment.getStatus() == PaymentStatus.SUCCESS) return;

        if (amountFromGateway != null && payment.getAmount() != null
                && payment.getAmount().intValue() != amountFromGateway) {
            throw new BusinessException(ErrorCode.PAYMENT_AMOUNT_MISMATCH, "Amount mismatch");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        walletService.creditWalletForTopup(
                payment.getUser().getUserId(),
                payment.getAmount(),
                payment.getPaymentId(),
                "Topup via PayOS"
        );
    }

    private PaymentStatus mapStatus(String payosStatus) {
        if (payosStatus == null) return PaymentStatus.PENDING;
        return switch (payosStatus.toUpperCase()) {
            case "PAID" -> PaymentStatus.SUCCESS;
            case "CANCELLED" -> PaymentStatus.CANCELLED;
            case "FAILED" -> PaymentStatus.FAILED;
            default -> PaymentStatus.PENDING;
        };
    }

    private long generateUniqueOrderCode() {
        // PayOS requires order_code <= 9007199254740991 (Number.MAX_SAFE_INTEGER)
        // Use last 10 digits of epoch millis + 3-digit random → max 13 digits, safely under limit
        for (int i = 0; i < 5; i++) {
            long timePart = System.currentTimeMillis() % 10_000_000_000L; // last 10 digits
            int rand = ThreadLocalRandom.current().nextInt(100, 999);
            long code = timePart * 1000L + rand;
            if (!paymentRepository.existsByPayosOrderCode(code)) return code;
        }
        throw new BusinessException(ErrorCode.PAYMENT_LINK_CREATION_FAILED, "Failed to generate order code");
    }
}

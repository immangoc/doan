package com.anhnht.warehouse.service.modules.wallet.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.infrastructure.mail.MailService;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.wallet.dto.request.ApproveWithdrawRequestDto;
import com.anhnht.warehouse.service.modules.wallet.dto.request.CreateWithdrawRequestDto;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WithdrawRequestListResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WithdrawRequestResponse;
import com.anhnht.warehouse.service.modules.wallet.entity.Wallet;
import com.anhnht.warehouse.service.modules.wallet.entity.WithdrawRequest;
import com.anhnht.warehouse.service.modules.wallet.entity.WithdrawStatus;
import com.anhnht.warehouse.service.modules.wallet.repository.WalletRepository;
import com.anhnht.warehouse.service.modules.wallet.repository.WithdrawRequestRepository;
import com.anhnht.warehouse.service.modules.wallet.service.WalletService;
import com.anhnht.warehouse.service.modules.wallet.service.WithdrawRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WithdrawRequestServiceImpl implements WithdrawRequestService {

    private final WithdrawRequestRepository withdrawRequestRepository;
    private final WalletRepository          walletRepository;
    private final WalletService             walletService;
    private final UserRepository            userRepository;
    private final MailService               mailService;

    @Override
    @Transactional
    public WithdrawRequestResponse create(Integer userId, CreateWithdrawRequestDto request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));

        Wallet wallet = walletRepository.findByUserUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WALLET_NOT_FOUND));

        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(ErrorCode.PAYMENT_AMOUNT_INVALID, "Amount must be positive");
        }
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new BusinessException(ErrorCode.WALLET_INSUFFICIENT_BALANCE);
        }

        WithdrawRequest entity = new WithdrawRequest();
        entity.setUser(user);
        entity.setAmount(amount);
        entity.setReason(request.getReason());
        entity.setBankName(request.getBankName());
        entity.setBankAccount(request.getBankAccount());
        entity.setStatus(WithdrawStatus.PENDING);

        return toResponse(withdrawRequestRepository.save(entity));
    }

    @Override
    public WithdrawRequestListResponse listAll() {
        List<WithdrawRequestResponse> items = withdrawRequestRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
        return WithdrawRequestListResponse.builder().items(items).build();
    }

    @Override
    @Transactional
    public WithdrawRequestResponse approve(Integer adminId, UUID requestId, ApproveWithdrawRequestDto request) {
        WithdrawRequest entity = withdrawRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WITHDRAW_REQUEST_NOT_FOUND));

        if (entity.getStatus() != WithdrawStatus.PENDING) {
            throw new BusinessException(ErrorCode.WITHDRAW_REQUEST_INVALID_STATE);
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));

        walletService.debitWalletForInvoice(
                entity.getUser().getUserId(),
                entity.getAmount(),
                "Withdraw approved: " + (entity.getTransactionCode() != null
                        ? entity.getTransactionCode()
                        : request.getTransactionCode()));

        entity.setStatus(WithdrawStatus.APPROVED);
        entity.setTransactionCode(request.getTransactionCode());
        entity.setProcessedBy(admin);
        entity.setProcessedAt(LocalDateTime.now());

        WithdrawRequest saved = withdrawRequestRepository.save(entity);
        notifyCustomer(saved);
        return toResponse(saved);
    }

    private void notifyCustomer(WithdrawRequest entity) {
        User customer = entity.getUser();
        if (customer == null || customer.getEmail() == null || customer.getEmail().isBlank()) {
            return;
        }
        String name = customer.getFullName() != null ? customer.getFullName() : customer.getUsername();
        String amountStr = entity.getAmount() == null ? "" : entity.getAmount().toPlainString();
        String subject = "[HT Port Logistics] Yêu cầu rút tiền đã được duyệt";
        String body = "Xin chào " + name + ",\n\n"
                + "Yêu cầu rút tiền của bạn đã được duyệt thành công.\n"
                + "- Số tiền: " + amountStr + " VND\n"
                + "- Ngân hàng: " + entity.getBankName() + "\n"
                + "- Số tài khoản: " + entity.getBankAccount() + "\n"
                + "- Mã giao dịch: " + entity.getTransactionCode() + "\n\n"
                + "Vui lòng kiểm tra tài khoản ngân hàng của bạn.\n"
                + "Trân trọng.";
        mailService.sendNotification(customer.getEmail(), subject, body);
    }

    private WithdrawRequestResponse toResponse(WithdrawRequest entity) {
        User user = entity.getUser();
        String userName = user == null ? null
                : (user.getFullName() != null ? user.getFullName() : user.getUsername());

        return WithdrawRequestResponse.builder()
                .id(entity.getWithdrawId())
                .userName(userName)
                .reason(entity.getReason())
                .amount(entity.getAmount())
                .bankName(entity.getBankName())
                .bankAccount(entity.getBankAccount())
                .status(entity.getStatus() == null ? null : entity.getStatus().name().toLowerCase())
                .transactionCode(entity.getTransactionCode())
                .rejectReason(entity.getRejectReason())
                .processedAt(entity.getProcessedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

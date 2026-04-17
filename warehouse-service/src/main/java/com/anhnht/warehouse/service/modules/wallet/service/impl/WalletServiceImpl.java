package com.anhnht.warehouse.service.modules.wallet.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.wallet.entity.Payment;
import com.anhnht.warehouse.service.modules.wallet.entity.Wallet;
import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransaction;
import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransactionType;
import com.anhnht.warehouse.service.modules.wallet.repository.PaymentRepository;
import com.anhnht.warehouse.service.modules.wallet.repository.WalletRepository;
import com.anhnht.warehouse.service.modules.wallet.repository.WalletTransactionRepository;
import com.anhnht.warehouse.service.modules.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WalletServiceImpl implements WalletService {

    private final WalletRepository             walletRepository;
    private final WalletTransactionRepository  walletTransactionRepository;
    private final UserRepository               userRepository;
    private final PaymentRepository            paymentRepository;

    @Override
    @Transactional
    public Wallet createWalletForUser(Integer userId) {
        if (walletRepository.existsByUserUserId(userId)) {
            return walletRepository.findByUserUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WALLET_NOT_FOUND));
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));

        Wallet wallet = new Wallet();
        wallet.setUser(user);
        wallet.setBalance(BigDecimal.ZERO);
        return walletRepository.save(wallet);
    }

    @Override
    public Wallet getByUserId(Integer userId) {
        return walletRepository.findByUserUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WALLET_NOT_FOUND));
    }

    @Override
    @Transactional
    public Wallet creditWalletForTopup(Integer userId, BigDecimal amount, UUID paymentId, String note) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PAYMENT_NOT_FOUND));
        return creditWallet(userId, amount, WalletTransactionType.TOPUP, payment, note);
    }

    @Override
    @Transactional
    public Wallet creditWalletForRefund(Integer userId, BigDecimal amount, String note) {
        return creditWallet(userId, amount, WalletTransactionType.REFUND, null, note);
    }

    @Override
    @Transactional
    public Wallet debitWalletForInvoice(Integer userId, BigDecimal amount, String note) {
        return debitWallet(userId, amount, WalletTransactionType.PAYMENT, note);
    }

    // ------------------------------------------------------

    private Wallet creditWallet(Integer userId, BigDecimal amount,
                                WalletTransactionType type, Payment payment, String note) {
        validateAmount(amount);

        if (payment != null && walletTransactionRepository.existsByPaymentPaymentId(payment.getPaymentId())) {
            return getByUserId(userId);
        }

        Wallet wallet = getOrCreateWalletForUpdate(userId);
        BigDecimal newBalance = wallet.getBalance().add(amount);
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setPayment(payment);
        tx.setType(type);
        tx.setAmount(amount);
        tx.setBalanceAfter(newBalance);
        tx.setNote(note);
        walletTransactionRepository.save(tx);

        return wallet;
    }

    private Wallet debitWallet(Integer userId, BigDecimal amount,
                               WalletTransactionType type, String note) {
        validateAmount(amount);

        Wallet wallet = getOrCreateWalletForUpdate(userId);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new BusinessException(ErrorCode.WALLET_INSUFFICIENT_BALANCE);
        }

        BigDecimal newBalance = wallet.getBalance().subtract(amount);
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setType(type);
        tx.setAmount(amount);
        tx.setBalanceAfter(newBalance);
        tx.setNote(note);
        walletTransactionRepository.save(tx);

        return wallet;
    }

    private Wallet getOrCreateWalletForUpdate(Integer userId) {
        return walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> createWalletForUser(userId));
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(ErrorCode.PAYMENT_AMOUNT_INVALID, "Amount must be positive");
        }
    }
}

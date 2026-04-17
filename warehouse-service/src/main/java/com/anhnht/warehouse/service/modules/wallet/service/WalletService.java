package com.anhnht.warehouse.service.modules.wallet.service;

import com.anhnht.warehouse.service.modules.wallet.entity.Wallet;

import java.math.BigDecimal;
import java.util.UUID;

public interface WalletService {

    Wallet createWalletForUser(Integer userId);

    Wallet getByUserId(Integer userId);

    Wallet creditWalletForTopup(Integer userId, BigDecimal amount, UUID paymentId, String note);

    Wallet creditWalletForRefund(Integer userId, BigDecimal amount, String note);

    Wallet debitWalletForInvoice(Integer userId, BigDecimal amount, String note);
}

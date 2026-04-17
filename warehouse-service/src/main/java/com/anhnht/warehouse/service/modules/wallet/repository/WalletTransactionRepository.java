package com.anhnht.warehouse.service.modules.wallet.repository;

import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    boolean existsByPaymentPaymentId(UUID paymentId);
}

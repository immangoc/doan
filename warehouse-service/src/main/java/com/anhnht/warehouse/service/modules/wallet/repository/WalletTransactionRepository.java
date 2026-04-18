package com.anhnht.warehouse.service.modules.wallet.repository;

import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransaction;
import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    boolean existsByPaymentPaymentId(UUID paymentId);

    @EntityGraph(attributePaths = {"payment"})
    Page<WalletTransaction> findByWalletWalletIdOrderByCreatedAtDesc(Integer walletId, Pageable pageable);

    long countByWalletWalletIdAndType(Integer walletId, WalletTransactionType type);
}

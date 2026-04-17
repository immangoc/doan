package com.anhnht.warehouse.service.modules.wallet.repository;

import com.anhnht.warehouse.service.modules.wallet.entity.Wallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Integer> {

    Optional<Wallet> findByUserUserId(Integer userId);

    boolean existsByUserUserId(Integer userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.user.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") Integer userId);
}

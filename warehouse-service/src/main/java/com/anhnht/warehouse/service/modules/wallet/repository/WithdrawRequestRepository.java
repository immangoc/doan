package com.anhnht.warehouse.service.modules.wallet.repository;

import com.anhnht.warehouse.service.modules.wallet.entity.WithdrawRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WithdrawRequestRepository extends JpaRepository<WithdrawRequest, UUID> {

    List<WithdrawRequest> findAllByOrderByCreatedAtDesc();

    List<WithdrawRequest> findByUserUserIdOrderByCreatedAtDesc(Integer userId);
}

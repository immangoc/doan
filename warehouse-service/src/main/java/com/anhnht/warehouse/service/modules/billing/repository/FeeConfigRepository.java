package com.anhnht.warehouse.service.modules.billing.repository;

import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeeConfigRepository extends JpaRepository<FeeConfig, Integer> {
}

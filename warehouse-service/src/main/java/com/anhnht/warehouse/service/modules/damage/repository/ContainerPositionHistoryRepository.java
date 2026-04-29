package com.anhnht.warehouse.service.modules.damage.repository;

import com.anhnht.warehouse.service.modules.damage.entity.ContainerPositionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContainerPositionHistoryRepository
        extends JpaRepository<ContainerPositionHistory, Integer> {
}

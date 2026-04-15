package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.ContainerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ContainerStatusRepository extends JpaRepository<ContainerStatus, Integer> {
    Optional<ContainerStatus> findByStatusNameIgnoreCase(String statusName);
    Optional<ContainerStatus> findByStatusName(String name);
}

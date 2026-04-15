package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.ExportPriority;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExportPriorityRepository extends JpaRepository<ExportPriority, Integer> {
    Optional<ExportPriority> findByContainerContainerId(String containerId);
}

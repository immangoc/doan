package com.anhnht.warehouse.service.modules.damage.repository;

import com.anhnht.warehouse.service.modules.damage.entity.DamageReport;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DamageReportRepository extends JpaRepository<DamageReport, Integer> {

    @EntityGraph(attributePaths = {"container", "container.containerType", "container.cargoType", "reportedBy"})
    List<DamageReport> findByReportStatusOrderByReportedAtDesc(String reportStatus);

    @EntityGraph(attributePaths = {"container", "container.containerType", "container.cargoType", "reportedBy"})
    List<DamageReport> findByReportStatusNotOrderByReportedAtDesc(String excludedStatus);

    @EntityGraph(attributePaths = {"container"})
    Optional<DamageReport> findFirstByContainerContainerIdAndReportStatusIn(
            String containerId, List<String> statuses);
}

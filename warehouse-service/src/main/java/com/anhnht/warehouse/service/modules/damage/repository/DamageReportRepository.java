package com.anhnht.warehouse.service.modules.damage.repository;

import com.anhnht.warehouse.service.modules.damage.entity.DamageReport;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
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

    /** Count all damage reports (excluding CANCELLED). */
    @Query("SELECT COUNT(r) FROM DamageReport r WHERE r.reportStatus <> 'CANCELLED'")
    long countAllActive();

    /** Sum of all compensationCost from damage reports (excluding CANCELLED). */
    @Query("SELECT COALESCE(SUM(r.compensationCost), 0) FROM DamageReport r WHERE r.reportStatus <> 'CANCELLED'")
    BigDecimal sumCompensationCostAll();

    /** Sum of all repairCost from damage reports (excluding CANCELLED). */
    @Query("SELECT COALESCE(SUM(r.repairCost), 0) FROM DamageReport r WHERE r.reportStatus <> 'CANCELLED'")
    BigDecimal sumRepairCostAll();

    /** Count damage reports where compensationRefunded = true. */
    @Query("SELECT COUNT(r) FROM DamageReport r WHERE r.compensationRefunded = true")
    long countRefunded();

    /** All damage reports excluding CANCELLED - used for listAll(). */
    @EntityGraph(attributePaths = {"container", "container.containerType", "container.cargoType", "reportedBy"})
    List<DamageReport> findByReportStatusNotInOrderByReportedAtDesc(List<String> excludedStatuses);
}

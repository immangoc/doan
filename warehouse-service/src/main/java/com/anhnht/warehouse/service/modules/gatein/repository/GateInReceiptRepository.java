package com.anhnht.warehouse.service.modules.gatein.repository;

import com.anhnht.warehouse.service.modules.gatein.entity.GateInReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GateInReceiptRepository extends JpaRepository<GateInReceipt, Integer> {

    @Query("SELECT COUNT(g) FROM GateInReceipt g WHERE CAST(g.gateInTime AS date) = :date")
    long countByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(g) FROM GateInReceipt g WHERE g.gateInTime BETWEEN :from AND :to")
    long countByDateRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Report: daily gate-in counts grouped by date within a range. Returns [date, count]. */
    @Query("SELECT CAST(g.gateInTime AS date), COUNT(g) " +
           "FROM GateInReceipt g " +
           "WHERE g.gateInTime BETWEEN :from AND :to " +
           "GROUP BY CAST(g.gateInTime AS date) " +
           "ORDER BY CAST(g.gateInTime AS date)")
    List<Object[]> countGroupedByDate(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @EntityGraph(attributePaths = {
            "container", "container.cargoType", "container.containerType", "container.status",
            "voyage", "createdBy"
    })
    @Query("SELECT g FROM GateInReceipt g")
    Page<GateInReceipt> findAllPaged(Pageable pageable);

    @EntityGraph(attributePaths = {
            "container", "container.cargoType", "container.containerType", "container.status",
            "voyage", "createdBy"
    })
    @Query("SELECT g FROM GateInReceipt g WHERE g.gateInId = :id")
    Optional<GateInReceipt> findByIdWithDetails(@Param("id") Integer id);

    boolean existsByContainerContainerId(String containerId);

    /** Latest gate-in time for a container (handles re-imports by taking the most recent). */
    Optional<GateInReceipt> findFirstByContainerContainerIdOrderByGateInTimeDesc(String containerId);
}

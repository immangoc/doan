package com.anhnht.warehouse.service.modules.gateout.repository;

import com.anhnht.warehouse.service.modules.gateout.entity.GateOutReceipt;
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

public interface GateOutReceiptRepository extends JpaRepository<GateOutReceipt, Integer> {

    @Query("SELECT COUNT(g) FROM GateOutReceipt g WHERE CAST(g.gateOutTime AS date) = :date")
    long countByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(g) FROM GateOutReceipt g WHERE g.gateOutTime BETWEEN :from AND :to")
    long countByDateRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Report: daily gate-out counts grouped by date within a range. Returns [date, count]. */
    @Query("SELECT CAST(g.gateOutTime AS date), COUNT(g) " +
           "FROM GateOutReceipt g " +
           "WHERE g.gateOutTime BETWEEN :from AND :to " +
           "GROUP BY CAST(g.gateOutTime AS date) " +
           "ORDER BY CAST(g.gateOutTime AS date)")
    List<Object[]> countGroupedByDate(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @EntityGraph(attributePaths = {"container", "createdBy"})
    @Query("SELECT g FROM GateOutReceipt g")
    Page<GateOutReceipt> findAllPaged(Pageable pageable);

    @EntityGraph(attributePaths = {"container", "createdBy"})
    @Query("SELECT g FROM GateOutReceipt g WHERE g.gateOutId = :id")
    Optional<GateOutReceipt> findByIdWithDetails(@Param("id") Integer id);

    boolean existsByContainerContainerId(String containerId);
}

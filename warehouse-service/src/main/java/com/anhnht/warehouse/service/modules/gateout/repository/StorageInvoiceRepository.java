package com.anhnht.warehouse.service.modules.gateout.repository;

import com.anhnht.warehouse.service.modules.gateout.entity.StorageInvoice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StorageInvoiceRepository extends JpaRepository<StorageInvoice, Integer> {

    @EntityGraph(attributePaths = {"container", "gateOutReceipt"})
    Optional<StorageInvoice> findByGateOutReceiptGateOutId(Integer gateOutId);

    boolean existsByContainerContainerId(String containerId);

    @EntityGraph(attributePaths = {"container", "gateOutReceipt"})
    @Query("SELECT i FROM StorageInvoice i WHERE i.container.containerId = :containerId")
    Optional<StorageInvoice> findByContainerId(@Param("containerId") String containerId);

    @Query("SELECT COUNT(i), COALESCE(SUM(i.totalFee), 0) " +
           "FROM StorageInvoice i WHERE i.createdAt BETWEEN :from AND :to")
    List<Object[]> aggregateByDateRange(@Param("from") LocalDateTime from,
                                        @Param("to")   LocalDateTime to);

    @Query("SELECT COUNT(i), COALESCE(SUM(i.overduePenalty), 0) " +
           "FROM StorageInvoice i WHERE i.isOverdue = true AND i.createdAt BETWEEN :from AND :to")
    List<Object[]> aggregateOverdueByDateRange(@Param("from") LocalDateTime from,
                                               @Param("to")   LocalDateTime to);
}

package com.anhnht.warehouse.service.modules.booking.repository;

import com.anhnht.warehouse.service.modules.booking.entity.BillOfLading;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BillOfLadingRepository extends JpaRepository<BillOfLading, Integer> {

    @EntityGraph(attributePaths = {"order", "status"})
    Optional<BillOfLading> findByOrderOrderId(Integer orderId);

    boolean existsByBillNumber(String billNumber);

    @EntityGraph(attributePaths = {"order", "status"})
    @Query("SELECT b FROM BillOfLading b WHERE b.billId = :id")
    Optional<BillOfLading> findByIdWithDetails(@Param("id") Integer id);
}

package com.anhnht.warehouse.service.modules.booking.repository;

import com.anhnht.warehouse.service.modules.booking.entity.BillOfLadingHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BillOfLadingHistoryRepository extends JpaRepository<BillOfLadingHistory, Integer> {

    @EntityGraph(attributePaths = {"status"})
    @Query("SELECT h FROM BillOfLadingHistory h WHERE h.bill.billId = :billId ORDER BY h.createdAt ASC")
    List<BillOfLadingHistory> findByBillIdOrdered(@Param("billId") Integer billId);
}

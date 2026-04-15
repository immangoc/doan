package com.anhnht.warehouse.service.modules.booking.repository;

import com.anhnht.warehouse.service.modules.booking.entity.BillOfLadingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BillOfLadingStatusRepository extends JpaRepository<BillOfLadingStatus, Integer> {
    Optional<BillOfLadingStatus> findByStatusNameIgnoreCase(String statusName);
}

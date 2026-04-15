package com.anhnht.warehouse.service.modules.booking.repository;

import com.anhnht.warehouse.service.modules.booking.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderStatusRepository extends JpaRepository<OrderStatus, Integer> {
    Optional<OrderStatus> findByStatusNameIgnoreCase(String statusName);
}

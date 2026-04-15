package com.anhnht.warehouse.service.modules.booking.repository;

import com.anhnht.warehouse.service.modules.booking.entity.OrderCancellation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderCancellationRepository extends JpaRepository<OrderCancellation, Integer> {
    Optional<OrderCancellation> findByOrderOrderId(Integer orderId);
}

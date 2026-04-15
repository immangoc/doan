package com.anhnht.warehouse.service.modules.alert.repository;

import com.anhnht.warehouse.service.modules.alert.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {
}

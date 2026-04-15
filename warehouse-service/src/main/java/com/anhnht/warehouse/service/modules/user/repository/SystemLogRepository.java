package com.anhnht.warehouse.service.modules.user.repository;

import com.anhnht.warehouse.service.modules.user.entity.SystemLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemLogRepository extends JpaRepository<SystemLog, Integer> {

    Page<SystemLog> findAllByUserUserId(Integer userId, Pageable pageable);
}

package com.anhnht.warehouse.service.modules.alert.repository;

import com.anhnht.warehouse.service.modules.alert.entity.AlertLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AlertLevelRepository extends JpaRepository<AlertLevel, Integer> {
    Optional<AlertLevel> findByLevelNameIgnoreCase(String levelName);
}

package com.anhnht.warehouse.service.modules.alert.repository;

import com.anhnht.warehouse.service.modules.alert.entity.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Integer> {

    long countByStatus(Short status);

    long countByStatusAndLevelLevelName(Short status, String levelName);

    @EntityGraph(attributePaths = {"zone", "level"})
    @Query("SELECT a FROM Alert a WHERE " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:levelName IS NULL OR a.level.levelName = :levelName)")
    Page<Alert> findAllFiltered(@Param("status") Short status,
                                @Param("levelName") String levelName,
                                Pageable pageable);

    @EntityGraph(attributePaths = {"zone", "level"})
    @Query("SELECT a FROM Alert a WHERE a.zone.zoneId = :zoneId ORDER BY a.createdAt DESC")
    Page<Alert> findByZoneId(@Param("zoneId") Integer zoneId, Pageable pageable);

    @EntityGraph(attributePaths = {"zone", "level"})
    @Query("SELECT a FROM Alert a WHERE a.alertId = :id")
    Optional<Alert> findByIdWithDetails(@Param("id") Integer id);
}

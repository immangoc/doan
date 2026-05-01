package com.anhnht.warehouse.service.modules.gatein.repository;

import com.anhnht.warehouse.service.modules.gatein.entity.PlacementTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlacementTaskRepository extends JpaRepository<PlacementTask, Integer> {
    List<PlacementTask> findByStatusOrderByCreatedAtDesc(String status);
    List<PlacementTask> findByContainerContainerIdAndStatus(String containerId, String status);
}

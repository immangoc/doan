package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.ContainerStatusHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ContainerStatusHistoryRepository extends JpaRepository<ContainerStatusHistory, Integer> {

    @EntityGraph(attributePaths = {"status"})
    @Query("SELECT h FROM ContainerStatusHistory h WHERE h.container.containerId = :containerId ORDER BY h.createdAt ASC")
    List<ContainerStatusHistory> findByContainerIdOrdered(@Param("containerId") String containerId);
}

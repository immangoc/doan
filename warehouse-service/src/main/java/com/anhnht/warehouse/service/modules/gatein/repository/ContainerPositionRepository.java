package com.anhnht.warehouse.service.modules.gatein.repository;

import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ContainerPositionRepository extends JpaRepository<ContainerPosition, Integer> {

    @EntityGraph(attributePaths = {"slot", "slot.block", "slot.block.zone", "slot.block.zone.yard", "slot.block.zone.yard.yardType"})
    Optional<ContainerPosition> findByContainerContainerId(String containerId);

    /** Batch-fetch positions for a list of container IDs (avoids N+1). */
    @EntityGraph(attributePaths = {"slot", "slot.block", "slot.block.zone", "slot.block.zone.yard", "slot.block.zone.yard.yardType"})
    @Query("SELECT cp FROM ContainerPosition cp WHERE cp.container.containerId IN :ids")
    List<ContainerPosition> findAllByContainerIds(@Param("ids") List<String> ids);

    @Query("SELECT COUNT(cp) FROM ContainerPosition cp WHERE cp.slot.slotId = :slotId AND cp.tier = :tier")
    int countBySlotAndTier(@Param("slotId") Integer slotId, @Param("tier") Integer tier);

    boolean existsByContainerContainerId(String containerId);

    /** Algorithm: all containers in a slot ordered tier DESC (top first, for BFS). */
    @Query("SELECT cp FROM ContainerPosition cp JOIN FETCH cp.container c " +
           "WHERE cp.slot.slotId = :slotId ORDER BY cp.tier DESC")
    List<ContainerPosition> findBySlotIdOrderByTierDesc(@Param("slotId") Integer slotId);

    /** Algorithm: count occupied positions in a zone (for occupancy rate). */
    @Query("SELECT COUNT(cp) FROM ContainerPosition cp " +
           "JOIN cp.slot s JOIN s.block b JOIN b.zone z WHERE z.zoneId = :zoneId")
    long countOccupiedInZone(@Param("zoneId") Integer zoneId);
}

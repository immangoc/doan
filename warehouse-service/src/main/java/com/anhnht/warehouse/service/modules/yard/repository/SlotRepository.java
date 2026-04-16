package com.anhnht.warehouse.service.modules.yard.repository;

import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SlotRepository extends JpaRepository<Slot, Integer> {

    @EntityGraph(attributePaths = {"block"})
    List<Slot> findAllByBlockBlockId(Integer blockId);

    @EntityGraph(attributePaths = {"block"})
    Optional<Slot> findById(Integer slotId);

    /** Used by gate-in assignPosition: loads full chain slot → block → zone so mapper never hits a closed session. */
    @Query("SELECT s FROM Slot s JOIN FETCH s.block b JOIN FETCH b.zone WHERE s.slotId = :slotId")
    Optional<Slot> findByIdWithDetails(@Param("slotId") Integer slotId);

    boolean existsByBlockBlockIdAndRowNoAndBayNo(Integer blockId, Integer rowNo, Integer bayNo);

    Optional<Slot> findByBlockBlockIdAndRowNoAndBayNo(Integer blockId, Integer rowNo, Integer bayNo);

    /** Used by algorithm: all NON-LOCKED slots in a zone, eagerly loaded */
    @Query("SELECT s FROM Slot s JOIN FETCH s.block b JOIN FETCH b.zone z WHERE z.zoneId = :zoneId AND (s.isLocked IS NULL OR s.isLocked = FALSE)")
    List<Slot> findAllByZoneId(@Param("zoneId") Integer zoneId);

    /** Used by algorithm: count occupied tiers at a slot */
    @Query("SELECT COUNT(cp) FROM ContainerPosition cp WHERE cp.slot.slotId = :slotId")
    int countOccupiedTiers(@Param("slotId") Integer slotId);

    /** Algorithm Pre-filter: all NON-LOCKED slots whose yard type matches the required yard type name. */
    @Query("SELECT s FROM Slot s " +
           "JOIN FETCH s.block b JOIN FETCH b.zone z JOIN FETCH z.yard y JOIN FETCH y.yardType yt " +
           "WHERE LOWER(yt.yardTypeName) = LOWER(:yardTypeName) AND (s.isLocked IS NULL OR s.isLocked = FALSE)")
    List<Slot> findByYardTypeName(@Param("yardTypeName") String yardTypeName);
}

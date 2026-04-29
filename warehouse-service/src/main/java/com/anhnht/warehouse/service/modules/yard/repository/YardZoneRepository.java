package com.anhnht.warehouse.service.modules.yard.repository;

import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface YardZoneRepository extends JpaRepository<YardZone, Integer> {

    @EntityGraph(attributePaths = {"yard", "yard.yardType"})
    List<YardZone> findAll();

    @EntityGraph(attributePaths = {"yard", "yard.yardType"})
    List<YardZone> findAllByYardYardIdOrderByZoneNameAsc(Integer yardId);

    default List<YardZone> findAllByYardYardId(Integer yardId) {
        return findAllByYardYardIdOrderByZoneNameAsc(yardId);
    }

    @EntityGraph(attributePaths = {"yard", "yard.yardType"})
    Optional<YardZone> findById(Integer zoneId);
}

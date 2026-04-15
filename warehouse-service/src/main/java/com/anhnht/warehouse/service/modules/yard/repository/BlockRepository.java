package com.anhnht.warehouse.service.modules.yard.repository;

import com.anhnht.warehouse.service.modules.yard.entity.Block;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BlockRepository extends JpaRepository<Block, Integer> {

    @EntityGraph(attributePaths = {"zone", "blockType"})
    List<Block> findAllByZoneZoneId(Integer zoneId);

    @EntityGraph(attributePaths = {"zone", "blockType"})
    Optional<Block> findById(Integer blockId);
}

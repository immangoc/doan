package com.anhnht.warehouse.service.modules.yard.repository;

import com.anhnht.warehouse.service.modules.yard.entity.Yard;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface YardRepository extends JpaRepository<Yard, Integer> {

    @EntityGraph(attributePaths = {"yardType"})
    List<Yard> findAll();

    @EntityGraph(attributePaths = {"yardType"})
    Optional<Yard> findById(Integer yardId);
}

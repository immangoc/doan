package com.anhnht.warehouse.service.modules.yard.repository;

import com.anhnht.warehouse.service.modules.yard.entity.YardType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface YardTypeRepository extends JpaRepository<YardType, Integer> {
    Optional<YardType> findByYardTypeName(String name);
}

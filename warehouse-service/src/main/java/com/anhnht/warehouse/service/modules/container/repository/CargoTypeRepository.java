package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.CargoType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CargoTypeRepository extends JpaRepository<CargoType, Integer> {
    boolean existsByCargoTypeName(String name);
    Optional<CargoType> findByCargoTypeName(String name);
}

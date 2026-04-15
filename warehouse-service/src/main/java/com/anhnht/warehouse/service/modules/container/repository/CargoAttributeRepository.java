package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.CargoAttribute;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CargoAttributeRepository extends JpaRepository<CargoAttribute, Integer> {
    boolean existsByAttributeName(String name);
}

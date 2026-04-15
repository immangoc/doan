package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.ContainerType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContainerTypeRepository extends JpaRepository<ContainerType, Integer> {
    boolean existsByContainerTypeName(String name);
}

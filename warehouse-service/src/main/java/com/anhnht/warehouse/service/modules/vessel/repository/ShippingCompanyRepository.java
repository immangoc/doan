package com.anhnht.warehouse.service.modules.vessel.repository;

import com.anhnht.warehouse.service.modules.vessel.entity.ShippingCompany;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShippingCompanyRepository extends JpaRepository<ShippingCompany, Integer> {
    boolean existsByName(String name);
}

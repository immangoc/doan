package com.anhnht.warehouse.service.modules.vessel.service;

import com.anhnht.warehouse.service.modules.vessel.entity.ShippingCompany;

import java.util.List;

public interface ShippingCompanyService {
    List<ShippingCompany> findAll();
    ShippingCompany findById(Integer id);
    ShippingCompany create(String name);
    ShippingCompany update(Integer id, String name);
    void delete(Integer id);
}

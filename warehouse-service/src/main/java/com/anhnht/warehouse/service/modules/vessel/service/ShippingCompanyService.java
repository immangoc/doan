package com.anhnht.warehouse.service.modules.vessel.service;

import com.anhnht.warehouse.service.modules.vessel.dto.request.ShippingCompanyRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.ShippingCompany;

import java.util.List;

public interface ShippingCompanyService {
    List<ShippingCompany> findAll();
    ShippingCompany findById(Integer id);
    ShippingCompany create(ShippingCompanyRequest request);
    ShippingCompany update(Integer id, ShippingCompanyRequest request);
    void delete(Integer id);
}

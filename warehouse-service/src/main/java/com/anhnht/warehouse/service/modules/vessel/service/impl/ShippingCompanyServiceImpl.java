package com.anhnht.warehouse.service.modules.vessel.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.vessel.dto.request.ShippingCompanyRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.ShippingCompany;
import com.anhnht.warehouse.service.modules.vessel.repository.ShippingCompanyRepository;
import com.anhnht.warehouse.service.modules.vessel.service.ShippingCompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShippingCompanyServiceImpl implements ShippingCompanyService {

    private final ShippingCompanyRepository repository;

    @Override
    public List<ShippingCompany> findAll() {
        return repository.findAll();
    }

    @Override
    public ShippingCompany findById(Integer id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Shipping company not found: " + id));
    }

    @Override
    @Transactional
    public ShippingCompany create(ShippingCompanyRequest request) {
        if (repository.existsByName(request.getName())) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Shipping company already exists: " + request.getName());
        }
        ShippingCompany entity = new ShippingCompany();
        entity.setName(request.getName());
        entity.setPhone(request.getPhone());
        entity.setEmail(request.getEmail());
        entity.setAddress(request.getAddress());
        entity.setCode(request.getCode());
        entity.setCountry(request.getCountry());
        return repository.save(entity);
    }

    @Override
    @Transactional
    public ShippingCompany update(Integer id, ShippingCompanyRequest request) {
        ShippingCompany entity = findById(id);
        entity.setName(request.getName());
        entity.setPhone(request.getPhone());
        entity.setEmail(request.getEmail());
        entity.setAddress(request.getAddress());
        entity.setCode(request.getCode());
        entity.setCountry(request.getCountry());
        return repository.save(entity);
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        ShippingCompany entity = findById(id);
        repository.delete(entity);
    }
}

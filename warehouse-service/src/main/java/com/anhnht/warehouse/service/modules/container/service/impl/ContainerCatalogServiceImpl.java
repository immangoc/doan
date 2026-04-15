package com.anhnht.warehouse.service.modules.container.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.container.entity.*;
import com.anhnht.warehouse.service.modules.container.repository.*;
import com.anhnht.warehouse.service.modules.container.service.ContainerCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContainerCatalogServiceImpl implements ContainerCatalogService {

    private final ContainerTypeRepository  containerTypeRepository;
    private final CargoTypeRepository      cargoTypeRepository;
    private final CargoAttributeRepository cargoAttributeRepository;
    private final ContainerStatusRepository containerStatusRepository;

    // ---- ContainerType ----

    @Override
    public List<ContainerType> getAllContainerTypes() {
        return containerTypeRepository.findAll();
    }

    @Override
    public ContainerType getContainerTypeById(Integer id) {
        return containerTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "ContainerType not found: " + id));
    }

    @Override
    @Transactional
    public ContainerType createContainerType(String name) {
        if (containerTypeRepository.existsByContainerTypeName(name)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Container type already exists: " + name);
        }
        return containerTypeRepository.save(new ContainerType(name));
    }

    @Override
    @Transactional
    public ContainerType updateContainerType(Integer id, String name) {
        ContainerType type = getContainerTypeById(id);
        type.setContainerTypeName(name);
        return containerTypeRepository.save(type);
    }

    @Override
    @Transactional
    public void deleteContainerType(Integer id) {
        containerTypeRepository.delete(getContainerTypeById(id));
    }

    // ---- CargoType ----

    @Override
    public List<CargoType> getAllCargoTypes() {
        return cargoTypeRepository.findAll();
    }

    @Override
    public CargoType getCargoTypeById(Integer id) {
        return cargoTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "CargoType not found: " + id));
    }

    @Override
    @Transactional
    public CargoType createCargoType(String name) {
        if (cargoTypeRepository.existsByCargoTypeName(name)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Cargo type already exists: " + name);
        }
        return cargoTypeRepository.save(new CargoType(name));
    }

    @Override
    @Transactional
    public CargoType updateCargoType(Integer id, String name) {
        CargoType type = getCargoTypeById(id);
        type.setCargoTypeName(name);
        return cargoTypeRepository.save(type);
    }

    @Override
    @Transactional
    public void deleteCargoType(Integer id) {
        cargoTypeRepository.delete(getCargoTypeById(id));
    }

    // ---- CargoAttribute ----

    @Override
    public List<CargoAttribute> getAllCargoAttributes() {
        return cargoAttributeRepository.findAll();
    }

    @Override
    public CargoAttribute getCargoAttributeById(Integer id) {
        return cargoAttributeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "CargoAttribute not found: " + id));
    }

    @Override
    @Transactional
    public CargoAttribute createCargoAttribute(String name) {
        if (cargoAttributeRepository.existsByAttributeName(name)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Cargo attribute already exists: " + name);
        }
        return cargoAttributeRepository.save(new CargoAttribute(name));
    }

    @Override
    @Transactional
    public CargoAttribute updateCargoAttribute(Integer id, String name) {
        CargoAttribute attr = getCargoAttributeById(id);
        attr.setAttributeName(name);
        return cargoAttributeRepository.save(attr);
    }

    @Override
    @Transactional
    public void deleteCargoAttribute(Integer id) {
        cargoAttributeRepository.delete(getCargoAttributeById(id));
    }

    // ---- ContainerStatus (read-only) ----

    @Override
    public List<ContainerStatus> getAllStatuses() {
        return containerStatusRepository.findAll();
    }

    @Override
    public ContainerStatus getStatusById(Integer id) {
        return containerStatusRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Status not found: " + id));
    }

    @Override
    public ContainerStatus getStatusByName(String name) {
        return containerStatusRepository.findByStatusName(name)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Status not found: " + name));
    }
}

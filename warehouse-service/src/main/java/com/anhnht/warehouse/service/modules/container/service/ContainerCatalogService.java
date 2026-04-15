package com.anhnht.warehouse.service.modules.container.service;

import com.anhnht.warehouse.service.modules.container.entity.*;

import java.util.List;

public interface ContainerCatalogService {

    // ContainerType
    List<ContainerType> getAllContainerTypes();
    ContainerType getContainerTypeById(Integer id);
    ContainerType createContainerType(String name);
    ContainerType updateContainerType(Integer id, String name);
    void deleteContainerType(Integer id);

    // CargoType
    List<CargoType> getAllCargoTypes();
    CargoType getCargoTypeById(Integer id);
    CargoType createCargoType(String name);
    CargoType updateCargoType(Integer id, String name);
    void deleteCargoType(Integer id);

    // CargoAttribute
    List<CargoAttribute> getAllCargoAttributes();
    CargoAttribute getCargoAttributeById(Integer id);
    CargoAttribute createCargoAttribute(String name);
    CargoAttribute updateCargoAttribute(Integer id, String name);
    void deleteCargoAttribute(Integer id);

    // ContainerStatus (read-only — seeded data)
    List<ContainerStatus> getAllStatuses();
    ContainerStatus getStatusById(Integer id);
    ContainerStatus getStatusByName(String name);
}

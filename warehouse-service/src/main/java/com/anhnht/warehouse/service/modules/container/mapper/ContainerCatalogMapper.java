package com.anhnht.warehouse.service.modules.container.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.container.dto.response.*;
import com.anhnht.warehouse.service.modules.container.entity.*;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface ContainerCatalogMapper {

    ContainerTypeResponse     toContainerTypeResponse(ContainerType entity);
    CargoTypeResponse         toCargoTypeResponse(CargoType entity);
    CargoAttributeResponse    toCargoAttributeResponse(CargoAttribute entity);
    ContainerStatusResponse   toContainerStatusResponse(ContainerStatus entity);

    List<ContainerTypeResponse>   toContainerTypeResponses(List<ContainerType> list);
    List<CargoTypeResponse>       toCargoTypeResponses(List<CargoType> list);
    List<CargoAttributeResponse>  toCargoAttributeResponses(List<CargoAttribute> list);
    List<ContainerStatusResponse> toContainerStatusResponses(List<ContainerStatus> list);
}

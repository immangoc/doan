package com.anhnht.warehouse.service.modules.container.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.container.dto.response.ContainerResponse;
import com.anhnht.warehouse.service.modules.container.dto.response.ContainerStatusHistoryResponse;
import com.anhnht.warehouse.service.modules.container.dto.response.ExportPriorityResponse;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.entity.ContainerStatusHistory;
import com.anhnht.warehouse.service.modules.container.entity.ExportPriority;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface ContainerMapper {

    @Mapping(source = "manifest.manifestId",           target = "manifestId")
    @Mapping(source = "containerType.containerTypeName", target = "containerTypeName")
    @Mapping(source = "status.statusName",             target = "statusName")
    @Mapping(source = "cargoType.cargoTypeName",       target = "cargoTypeName")
    @Mapping(source = "attribute.attributeName",       target = "attributeName")
    ContainerResponse toContainerResponse(Container container);

    @Mapping(source = "status.statusName", target = "statusName")
    ContainerStatusHistoryResponse toHistoryResponse(ContainerStatusHistory history);

    @Mapping(source = "container.containerId", target = "containerId")
    ExportPriorityResponse toExportPriorityResponse(ExportPriority priority);

    List<ContainerResponse>              toContainerResponses(List<Container> list);
    List<ContainerStatusHistoryResponse> toHistoryResponses(List<ContainerStatusHistory> list);
}

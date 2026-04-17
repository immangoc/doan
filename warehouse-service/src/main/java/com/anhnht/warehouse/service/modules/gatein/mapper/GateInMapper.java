package com.anhnht.warehouse.service.modules.gatein.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.gatein.dto.response.ContainerPositionResponse;
import com.anhnht.warehouse.service.modules.gatein.dto.response.GateInReceiptResponse;
import com.anhnht.warehouse.service.modules.gatein.dto.response.YardStorageResponse;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.entity.GateInReceipt;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface GateInMapper {

    // All nested paths are eagerly loaded via @EntityGraph in GateInReceiptRepository.findAllPaged
    @Mapping(source = "container.containerId",                    target = "containerId")
    @Mapping(source = "voyage.voyageId",                          target = "voyageId",           nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "voyage.voyageNo",                          target = "voyageNo",            nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "createdBy.userId",                         target = "createdById",         nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "createdBy.username",                       target = "createdByUsername",   nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "createdBy.username",                       target = "operatorName",        nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "container.cargoType.cargoTypeName",        target = "cargoTypeName",       nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "container.containerType.containerTypeName",target = "containerTypeName",  nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "container.grossWeight",                    target = "grossWeight",         nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(source = "container.status.statusName",              target = "statusName",          nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
    @Mapping(target = "yardName",  ignore = true)
    @Mapping(target = "zoneName",  ignore = true)
    @Mapping(target = "blockName", ignore = true)
    @Mapping(target = "rowNo",     ignore = true)
    @Mapping(target = "bayNo",     ignore = true)
    @Mapping(target = "tier",      ignore = true)
    GateInReceiptResponse toGateInResponse(GateInReceipt receipt);

    @Mapping(source = "container.containerId",    target = "containerId")
    @Mapping(source = "slot.slotId",              target = "slotId")
    @Mapping(source = "slot.rowNo",               target = "rowNo")
    @Mapping(source = "slot.bayNo",               target = "bayNo")
    @Mapping(source = "slot.block.blockName",     target = "blockName")
    @Mapping(source = "slot.block.zone.zoneName", target = "zoneName")
    ContainerPositionResponse toPositionResponse(ContainerPosition position);

    @Mapping(source = "container.containerId",    target = "containerId")
    @Mapping(source = "yard.yardId",              target = "yardId")
    @Mapping(source = "yard.yardName",            target = "yardName")
    YardStorageResponse toYardStorageResponse(YardStorage storage);

    List<GateInReceiptResponse> toGateInResponses(List<GateInReceipt> list);
    List<YardStorageResponse>   toYardStorageResponses(List<YardStorage> list);
}

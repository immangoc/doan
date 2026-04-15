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

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface GateInMapper {

    @Mapping(source = "container.containerId",    target = "containerId")
    @Mapping(source = "voyage.voyageId",          target = "voyageId")
    @Mapping(source = "voyage.voyageNo",          target = "voyageNo")
    @Mapping(source = "createdBy.userId",         target = "createdById")
    @Mapping(source = "createdBy.username",       target = "createdByUsername")
    @Mapping(source = "createdBy.username",       target = "operatorName")
    @Mapping(source = "container.cargoType.cargoTypeName", target = "cargoTypeName")
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

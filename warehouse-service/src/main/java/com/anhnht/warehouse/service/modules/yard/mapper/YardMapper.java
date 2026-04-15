package com.anhnht.warehouse.service.modules.yard.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.yard.dto.response.*;
import com.anhnht.warehouse.service.modules.yard.entity.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface YardMapper {

    YardTypeResponse  toYardTypeResponse(YardType entity);
    BlockTypeResponse toBlockTypeResponse(BlockType entity);

    YardResponse toYardResponse(Yard yard);

    @Mapping(source = "yard.yardId",   target = "yardId")
    @Mapping(source = "yard.yardName", target = "yardName")
    YardZoneResponse toYardZoneResponse(YardZone zone);

    @Mapping(source = "zone.zoneId",   target = "zoneId")
    @Mapping(source = "zone.zoneName", target = "zoneName")
    BlockResponse toBlockResponse(Block block);

    @Mapping(source = "block.blockId",   target = "blockId")
    @Mapping(source = "block.blockName", target = "blockName")
    SlotResponse toSlotResponse(Slot slot);

    List<YardTypeResponse>  toYardTypeResponses(List<YardType> list);
    List<YardResponse>      toYardResponses(List<Yard> list);
    List<YardZoneResponse>  toYardZoneResponses(List<YardZone> list);
    List<BlockTypeResponse> toBlockTypeResponses(List<BlockType> list);
    List<BlockResponse>     toBlockResponses(List<Block> list);
    List<SlotResponse>      toSlotResponses(List<Slot> list);
}

package com.anhnht.warehouse.service.modules.gateout.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.gateout.dto.response.GateOutReceiptResponse;
import com.anhnht.warehouse.service.modules.gateout.entity.GateOutReceipt;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface GateOutMapper {

    @Mapping(source = "container.containerId", target = "containerId")
    @Mapping(source = "createdBy.userId",      target = "createdById")
    @Mapping(source = "createdBy.username",    target = "createdByUsername")
    GateOutReceiptResponse toResponse(GateOutReceipt receipt);

    List<GateOutReceiptResponse> toResponses(List<GateOutReceipt> list);
}

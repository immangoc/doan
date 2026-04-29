package com.anhnht.warehouse.service.modules.gateout.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationMove;
import com.anhnht.warehouse.service.modules.gateout.dto.response.GateOutReceiptResponse;
import com.anhnht.warehouse.service.modules.gateout.entity.GateOutReceipt;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mapstruct.*;

import java.util.Collections;
import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface GateOutMapper {

    @Mapping(source = "container.containerId", target = "containerId")
    @Mapping(source = "createdBy.userId",      target = "createdById")
    @Mapping(source = "createdBy.username",    target = "createdByUsername")
    @Mapping(target = "relocationMoves", ignore = true)
    GateOutReceiptResponse toResponse(GateOutReceipt receipt);

    List<GateOutReceiptResponse> toResponses(List<GateOutReceipt> list);

    @AfterMapping
    default void mapRelocationMoves(GateOutReceipt receipt, @MappingTarget GateOutReceiptResponse response) {
        if (receipt.getRelocationPlanJson() != null && !receipt.getRelocationPlanJson().isBlank()) {
            try {
                ObjectMapper om = new ObjectMapper();
                om.findAndRegisterModules();
                List<RelocationMove> moves = om.readValue(
                        receipt.getRelocationPlanJson(),
                        new TypeReference<List<RelocationMove>>() {});
                response.setRelocationMoves(moves);
            } catch (Exception e) {
                response.setRelocationMoves(Collections.emptyList());
            }
        }
        response.setRelocationMessage(receipt.getRelocationMessage());
    }
}

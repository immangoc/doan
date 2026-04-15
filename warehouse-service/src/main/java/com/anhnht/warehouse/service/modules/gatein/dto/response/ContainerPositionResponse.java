package com.anhnht.warehouse.service.modules.gatein.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ContainerPositionResponse {

    private Integer       positionId;
    private String        containerId;
    private Integer       slotId;
    private Integer       rowNo;
    private Integer       bayNo;
    private String        blockName;
    private String        zoneName;
    private Integer       tier;
    private LocalDateTime updatedAt;
}

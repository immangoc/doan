package com.anhnht.warehouse.service.modules.yard.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RelocationResponse {

    private String        containerId;
    private Integer       fromSlotId;
    private Integer       toSlotId;
    private Integer       tier;
    private LocalDateTime updatedAt;
}

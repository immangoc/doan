package com.anhnht.warehouse.service.modules.yard.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SwapResponse {

    private String  containerIdA;
    private Integer containerANewSlotId;
    private Integer containerANewTier;

    private String  containerIdB;
    private Integer containerBNewSlotId;
    private Integer containerBNewTier;
}

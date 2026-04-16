package com.anhnht.warehouse.service.modules.yard.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SlotResponse {
    private Integer slotId;
    private Integer blockId;
    private String  blockName;
    private Integer rowNo;
    private Integer bayNo;
    private Integer maxTier;
}

package com.anhnht.warehouse.service.modules.yard.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
public class SlotResponse {
    private Integer slotId;
    private Integer blockId;
    private String  blockName;
    private Integer rowNo;
    private Integer bayNo;
    private Integer maxTier;
    private Boolean locked;
    private String lockReason;
    private LocalDateTime lockedAt;
}

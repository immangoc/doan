package com.anhnht.warehouse.service.modules.yard.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class BlockResponse {
    private Integer           blockId;
    private Integer           zoneId;
    private String            zoneName;
    private String            blockName;
    private BlockTypeResponse blockType;
}

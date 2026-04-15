package com.anhnht.warehouse.service.modules.yard.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class YardZoneResponse {
    private Integer zoneId;
    private Integer yardId;
    private String  yardName;
    private String  zoneName;
    private Integer capacitySlots;
}

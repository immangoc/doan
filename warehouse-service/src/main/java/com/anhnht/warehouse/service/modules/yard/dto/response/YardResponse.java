package com.anhnht.warehouse.service.modules.yard.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class YardResponse {
    private Integer          yardId;
    private String           yardName;
    private String           address;
    private YardTypeResponse yardType;
}

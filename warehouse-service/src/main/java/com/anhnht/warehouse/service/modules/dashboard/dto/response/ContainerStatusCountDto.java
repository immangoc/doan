package com.anhnht.warehouse.service.modules.dashboard.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ContainerStatusCountDto {
    private String statusName;
    private long   count;
}

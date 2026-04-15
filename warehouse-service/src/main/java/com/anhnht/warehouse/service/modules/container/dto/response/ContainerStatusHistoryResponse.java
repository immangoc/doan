package com.anhnht.warehouse.service.modules.container.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ContainerStatusHistoryResponse {

    private Integer       historyId;
    private String        statusName;
    private String        description;
    private LocalDateTime createdAt;
}

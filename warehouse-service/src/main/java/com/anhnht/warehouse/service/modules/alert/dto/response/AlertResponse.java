package com.anhnht.warehouse.service.modules.alert.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AlertResponse {

    private Integer       alertId;
    private Integer       zoneId;
    private String        zoneName;
    private String        levelName;
    private String        description;
    private LocalDateTime createdAt;
    private Short         status;      // 0 = OPEN, 1 = ACKNOWLEDGED
    private String        containerId;
    private String        reportedByName;
    private String        yardName;
}

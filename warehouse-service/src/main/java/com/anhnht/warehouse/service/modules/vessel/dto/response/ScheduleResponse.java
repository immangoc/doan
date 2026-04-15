package com.anhnht.warehouse.service.modules.vessel.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ScheduleResponse {
    private Integer       scheduleId;
    private String        companyName;
    private String        shipName;
    private String        type;
    private LocalDateTime timeStart;
    private LocalDateTime timeEnd;
    private String        location;
    private Integer       containers;
    private String        status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

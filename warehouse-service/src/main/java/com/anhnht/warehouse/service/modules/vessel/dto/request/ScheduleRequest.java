package com.anhnht.warehouse.service.modules.vessel.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ScheduleRequest {

    @Size(max = 100)
    private String companyName;

    @Size(max = 100)
    private String shipName;

    @Size(max = 20)
    private String type;

    private LocalDateTime timeStart;
    private LocalDateTime timeEnd;

    @Size(max = 255)
    private String location;

    private Integer containers;

    @Size(max = 30)
    private String status;

    @Size(max = 50)
    private String shipType;
}

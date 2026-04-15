package com.anhnht.warehouse.service.modules.gatein.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class YardStorageResponse {

    private Integer   storageId;
    private String    containerId;
    private Integer   yardId;
    private String    yardName;
    private LocalDate storageStartDate;
    private LocalDate storageEndDate;
    private String    note;
}

package com.anhnht.warehouse.service.modules.report.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class DailyGateActivityDto {
    private LocalDate date;
    private long      gateIn;
    private long      gateOut;
}

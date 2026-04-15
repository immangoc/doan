package com.anhnht.warehouse.service.modules.report.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class GateActivityReportResponse {
    private LocalDate              from;
    private LocalDate              to;
    private long                   totalGateIn;
    private long                   totalGateOut;
    private List<DailyGateActivityDto> daily;
}

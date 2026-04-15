package com.anhnht.warehouse.service.modules.report.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.Map;

@Getter
@Builder
public class OrderReportResponse {

    private long      totalOrders;
    private long      ordersInPeriod;
    private LocalDate from;
    private LocalDate to;

    /** {statusName → count} */
    private Map<String, Long> byStatus;
}

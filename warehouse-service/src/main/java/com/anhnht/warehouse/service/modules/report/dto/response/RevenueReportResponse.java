package com.anhnht.warehouse.service.modules.report.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class RevenueReportResponse {

    private LocalDate  fromDate;
    private LocalDate  toDate;
    private long       totalInvoices;
    private BigDecimal totalAmount;
    private BigDecimal overdueAmount;    // subset: penalty fees collected
    private long       overdueInvoices;  // count of invoices where isOverdue = true
}

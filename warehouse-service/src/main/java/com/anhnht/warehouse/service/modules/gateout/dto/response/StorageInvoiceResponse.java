package com.anhnht.warehouse.service.modules.gateout.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class StorageInvoiceResponse {

    private Integer       invoiceId;
    private String        containerId;
    private Integer       gateOutId;

    private Integer       storageDays;
    private BigDecimal    dailyRate;
    private BigDecimal    baseFee;
    private BigDecimal    overduePenalty;
    private BigDecimal    totalFee;

    private Boolean       isOverdue;
    private Integer       overdueDays;

    private LocalDateTime createdAt;
}

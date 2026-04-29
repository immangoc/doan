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
    private String        containerCode;
    private String        cargoTypeName;
    private String        containerTypeName;
    private Integer       gateOutId;

    private LocalDateTime gateInTime;
    private LocalDateTime gateOutTime;

    private Integer       storageDays;
    private BigDecimal    dailyRate;
    private BigDecimal    baseFee;
    private BigDecimal    overduePenalty;
    private BigDecimal    totalFee;

    private Boolean       isOverdue;
    private Integer       overdueDays;

    private LocalDateTime createdAt;
}

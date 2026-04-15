package com.anhnht.warehouse.service.modules.gateout.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Computed storage bill — derived from yard_storage records.
 * Not persisted (no invoice table in schema).
 * Represents a summary of storage fees for a container.
 */
@Getter
@Builder
public class StorageBillResponse {

    private String     containerId;
    private String     yardName;

    private LocalDate  storageStartDate;
    private LocalDate  storageEndDate;     // null = still in yard

    private long       storageDays;
    private BigDecimal dailyRate;          // from AppConstant
    private BigDecimal baseFee;            // storageDays × dailyRate
    private BigDecimal overduePenalty;     // > 0 if past expected exit date
    private BigDecimal totalFee;           // baseFee + overduePenalty

    private boolean    isOverdue;
    private long       overdueDays;        // how many days past expected exit
}

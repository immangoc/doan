package com.anhnht.warehouse.service.modules.lookup.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FeeConfigResponse {

    private double dailyStorageRate;   // USD per day after grace period
    private double overdueStorageRate; // USD per day when container is overdue
    private int    freeStorageDays;    // grace period before billing starts

    private int    deadlineWarnDays;   // days before expiry to generate WARNING alert
    private int    deadlineUrgentDays; // days before expiry to generate CRITICAL alert

    private double zoneOccupancyWarnThreshold;     // e.g. 0.80
    private double zoneOccupancyCriticalThreshold; // e.g. 0.90
}

package com.anhnht.warehouse.service.modules.dashboard.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AdminDashboardResponse {

    // Gate activity — today
    private long gateInToday;
    private long gateOutToday;

    // Container snapshot
    private long containersInYard;
    private long totalContainers;
    private long overdueContainers;

    // Orders
    private long pendingOrders;
    private long totalOrders;

    // Alerts
    private long openAlerts;
    private long criticalAlerts;

    // Financials
    private java.math.BigDecimal totalRepairCost;
    private java.math.BigDecimal totalCompensationCost;

    // Breakdown lists
    private List<ContainerStatusCountDto> containersByStatus;
    private List<ZoneOccupancyDto>        zoneOccupancy;
}

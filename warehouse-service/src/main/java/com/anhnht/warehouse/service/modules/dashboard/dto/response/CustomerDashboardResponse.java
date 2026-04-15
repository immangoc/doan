package com.anhnht.warehouse.service.modules.dashboard.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CustomerDashboardResponse {

    private long   myContainersInYard;
    private long   myPendingOrders;
    private long   myTotalOrders;

    /** Container IDs with expected exit date within 7 days. */
    private List<String> nearExpiryContainerIds;
}

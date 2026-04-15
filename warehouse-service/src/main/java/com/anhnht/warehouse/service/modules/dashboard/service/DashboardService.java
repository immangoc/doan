package com.anhnht.warehouse.service.modules.dashboard.service;

import com.anhnht.warehouse.service.modules.dashboard.dto.response.AdminDashboardResponse;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.CustomerDashboardResponse;

public interface DashboardService {

    AdminDashboardResponse getAdminDashboard();

    CustomerDashboardResponse getCustomerDashboard(Integer userId);
}

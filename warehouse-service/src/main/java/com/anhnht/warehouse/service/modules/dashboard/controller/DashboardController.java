package com.anhnht.warehouse.service.modules.dashboard.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.AdminDashboardResponse;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.CustomerDashboardResponse;
import com.anhnht.warehouse.service.modules.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * GET /admin/dashboard
     * System-wide dashboard for admins and operators.
     */
    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR', 'YARD_STAFF')")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> adminDashboard() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getAdminDashboard()));
    }

    /**
     * GET /dashboard
     * Customer-specific dashboard (own containers, orders, near-expiry).
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CustomerDashboardResponse>> customerDashboard() {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getCustomerDashboard(userId)));
    }
}

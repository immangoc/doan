package com.anhnht.warehouse.service.modules.report.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.ContainerInventoryResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.GateActivityReportResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.OrderReportResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.RevenueReportResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.ZoneOccupancyReportResponse;
import com.anhnht.warehouse.service.modules.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Báo cáo", description = "Xuất báo cáo thống kê")
@RestController
@RequestMapping("/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
public class ReportController {

    private final ReportService reportService;

    /**
     * GET /admin/reports/gate-activity?from=2026-01-01&to=2026-03-31
     * Daily gate-in / gate-out breakdown for a date range.
     */
    @GetMapping("/gate-activity")
    public ResponseEntity<ApiResponse<GateActivityReportResponse>> gateActivity(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(ApiResponse.success(reportService.getGateActivityReport(from, to)));
    }

    /**
     * GET /admin/reports/container-inventory
     * Container counts by status, cargo type, and container type.
     */
    @GetMapping("/container-inventory")
    public ResponseEntity<ApiResponse<ContainerInventoryResponse>> containerInventory() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getContainerInventoryReport()));
    }

    /**
     * GET /admin/reports/orders?from=2026-01-01&to=2026-03-31
     * Order summary for a date range.
     */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<OrderReportResponse>> orderReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(ApiResponse.success(reportService.getOrderReport(from, to)));
    }

    /**
     * GET /admin/reports/zone-occupancy
     * Current occupancy rates per zone with totals.
     */
    @GetMapping("/zone-occupancy")
    public ResponseEntity<ApiResponse<ZoneOccupancyReportResponse>> zoneOccupancy() {
        return ResponseEntity.ok(ApiResponse.success(reportService.getZoneOccupancyReport()));
    }

    /**
     * GET /admin/reports/revenue?from=2026-01-01&to=2026-03-31
     * Aggregated revenue from persisted storage invoices for a date range.
     */
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<RevenueReportResponse>> revenueReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getRevenueReport(from, to)));
    }

    /**
     * GET /admin/reports/export?from=2026-01-01&to=2026-12-31
     * Downloads a CSV file containing all report sections for the given period.
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        byte[] csv = reportService.exportReportAsCsv(from, to);
        String filename = "bao-cao-" + from + "-den-" + to + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentLength(csv.length)
                .body(csv);
    }
}

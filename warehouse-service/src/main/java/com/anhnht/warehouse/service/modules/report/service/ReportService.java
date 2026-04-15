package com.anhnht.warehouse.service.modules.report.service;

import com.anhnht.warehouse.service.modules.report.dto.response.ContainerInventoryResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.GateActivityReportResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.OrderReportResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.RevenueReportResponse;
import com.anhnht.warehouse.service.modules.report.dto.response.ZoneOccupancyReportResponse;

import java.time.LocalDate;

public interface ReportService {

    GateActivityReportResponse getGateActivityReport(LocalDate from, LocalDate to);

    ContainerInventoryResponse getContainerInventoryReport();

    OrderReportResponse getOrderReport(LocalDate from, LocalDate to);

    ZoneOccupancyReportResponse getZoneOccupancyReport();

    RevenueReportResponse getRevenueReport(LocalDate from, LocalDate to);

    byte[] exportReportAsCsv(LocalDate from, LocalDate to);
}

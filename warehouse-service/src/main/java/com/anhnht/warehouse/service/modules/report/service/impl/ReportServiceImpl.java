package com.anhnht.warehouse.service.modules.report.service.impl;

import com.anhnht.warehouse.service.modules.booking.repository.OrderRepository;
import com.anhnht.warehouse.service.modules.container.repository.ContainerRepository;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.ZoneOccupancyDto;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.GateInReceiptRepository;
import com.anhnht.warehouse.service.modules.gateout.repository.GateOutReceiptRepository;
import com.anhnht.warehouse.service.modules.gateout.repository.StorageInvoiceRepository;
import com.anhnht.warehouse.service.modules.report.dto.response.*;
import com.anhnht.warehouse.service.modules.report.service.ReportService;
import com.anhnht.warehouse.service.modules.yard.repository.YardZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final GateInReceiptRepository     gateInReceiptRepository;
    private final GateOutReceiptRepository    gateOutReceiptRepository;
    private final StorageInvoiceRepository    invoiceRepository;
    private final ContainerRepository         containerRepository;
    private final OrderRepository             orderRepository;
    private final YardZoneRepository          yardZoneRepository;
    private final ContainerPositionRepository containerPositionRepository;

    @Override
    public GateActivityReportResponse getGateActivityReport(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end   = to.atTime(LocalTime.MAX);

        long totalGateIn  = gateInReceiptRepository.countByDateRange(start, end);
        long totalGateOut = gateOutReceiptRepository.countByDateRange(start, end);

        // Build per-date maps
        Map<LocalDate, Long> gateInByDay = toDateMap(
                gateInReceiptRepository.countGroupedByDate(start, end));
        Map<LocalDate, Long> gateOutByDay = toDateMap(
                gateOutReceiptRepository.countGroupedByDate(start, end));

        // Merge into daily list covering every date in range
        List<DailyGateActivityDto> daily = from.datesUntil(to.plusDays(1))
                .map(date -> new DailyGateActivityDto(
                        date,
                        gateInByDay.getOrDefault(date, 0L),
                        gateOutByDay.getOrDefault(date, 0L)))
                .collect(Collectors.toList());

        return GateActivityReportResponse.builder()
                .from(from)
                .to(to)
                .totalGateIn(totalGateIn)
                .totalGateOut(totalGateOut)
                .daily(daily)
                .build();
    }

    @Override
    public ContainerInventoryResponse getContainerInventoryReport() {
        long total = containerRepository.count();

        Map<String, Long> byStatus = toStringLongMap(
                containerRepository.countGroupedByStatus());
        Map<String, Long> byCargoType = toStringLongMap(
                containerRepository.countGroupedByCargoType());
        Map<String, Long> byContainerType = toStringLongMap(
                containerRepository.countGroupedByContainerType());

        return ContainerInventoryResponse.builder()
                .totalContainers(total)
                .byStatus(byStatus)
                .byCargoType(byCargoType)
                .byContainerType(byContainerType)
                .build();
    }

    @Override
    public OrderReportResponse getOrderReport(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end   = to.atTime(LocalTime.MAX);

        long total         = orderRepository.count();
        long ordersInPeriod = orderRepository.countByDateRange(start, end);

        Map<String, Long> byStatus = toStringLongMap(
                orderRepository.countGroupedByStatus());

        return OrderReportResponse.builder()
                .totalOrders(total)
                .ordersInPeriod(ordersInPeriod)
                .from(from)
                .to(to)
                .byStatus(byStatus)
                .build();
    }

    @Override
    public ZoneOccupancyReportResponse getZoneOccupancyReport() {
        List<ZoneOccupancyDto> zones = yardZoneRepository.findAll()
                .stream()
                .map(zone -> {
                    int    capacity = zone.getCapacitySlots();
                    long   occupied = containerPositionRepository.countOccupiedInZone(zone.getZoneId());
                    double rate     = capacity > 0 ? (double) occupied / capacity : 0.0;
                    String yardName = zone.getYard() != null ? zone.getYard().getYardName() : "";
                    String yardType = (zone.getYard() != null && zone.getYard().getYardType() != null)
                            ? zone.getYard().getYardType().getYardTypeName() : "";
                    return new ZoneOccupancyDto(zone.getZoneId(), zone.getZoneName(),
                            yardName, yardType, capacity, occupied, rate);
                })
                .collect(Collectors.toList());

        long totalCapacity = zones.stream().mapToLong(ZoneOccupancyDto::getCapacitySlots).sum();
        long totalOccupied = zones.stream().mapToLong(ZoneOccupancyDto::getOccupiedSlots).sum();
        double overallRate = totalCapacity > 0 ? (double) totalOccupied / totalCapacity : 0.0;

        return ZoneOccupancyReportResponse.builder()
                .totalCapacity(totalCapacity)
                .totalOccupied(totalOccupied)
                .overallOccupancyRate(overallRate)
                .zones(zones)
                .build();
    }

    @Override
    public RevenueReportResponse getRevenueReport(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from.atStartOfDay();
        LocalDateTime toDt   = to.atTime(LocalTime.MAX);

        List<Object[]> totalsList  = invoiceRepository.aggregateByDateRange(fromDt, toDt);
        List<Object[]> overdueList = invoiceRepository.aggregateOverdueByDateRange(fromDt, toDt);

        Object[] totals  = totalsList.isEmpty()  ? new Object[]{0L, BigDecimal.ZERO} : totalsList.get(0);
        Object[] overdue = overdueList.isEmpty() ? new Object[]{0L, BigDecimal.ZERO} : overdueList.get(0);

        long       totalInvoices   = ((Number) totals[0]).longValue();
        BigDecimal totalAmount     = totals[1] instanceof BigDecimal bd ? bd
                                         : BigDecimal.valueOf(((Number) totals[1]).doubleValue());
        long       overdueInvoices = ((Number) overdue[0]).longValue();
        BigDecimal overdueAmount   = overdue[1] instanceof BigDecimal bd ? bd
                                         : BigDecimal.valueOf(((Number) overdue[1]).doubleValue());

        BigDecimal orderPaidAmount = orderRepository.sumPaidAmountByDateRange(fromDt, toDt);
        totalAmount = totalAmount.add(orderPaidAmount);

        return RevenueReportResponse.builder()
                .fromDate(from)
                .toDate(to)
                .totalInvoices(totalInvoices)
                .totalAmount(totalAmount)
                .overdueInvoices(overdueInvoices)
                .overdueAmount(overdueAmount)
                .build();
    }

    @Override
    public byte[] exportReportAsCsv(LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder("\uFEFF"); // UTF-8 BOM for Excel compatibility

        // Revenue
        RevenueReportResponse revenue = getRevenueReport(from, to);
        sb.append("=== BÁO CÁO DOANH THU ===\n");
        sb.append("Kỳ báo cáo,").append(from).append(" đến ").append(to).append("\n");
        sb.append("Tổng hóa đơn,").append(revenue.getTotalInvoices()).append("\n");
        sb.append("Tổng doanh thu,").append(revenue.getTotalAmount()).append("\n");
        sb.append("Hóa đơn quá hạn,").append(revenue.getOverdueInvoices()).append("\n");
        sb.append("Giá trị quá hạn,").append(revenue.getOverdueAmount()).append("\n\n");

        // Gate activity
        GateActivityReportResponse gate = getGateActivityReport(from, to);
        sb.append("=== HOẠT ĐỘNG GATE ===\n");
        sb.append("Tổng gate vào,").append(gate.getTotalGateIn()).append("\n");
        sb.append("Tổng gate ra,").append(gate.getTotalGateOut()).append("\n");
        if (gate.getDaily() != null && !gate.getDaily().isEmpty()) {
            sb.append("Ngày,Gate vào,Gate ra\n");
            for (var d : gate.getDaily()) {
                sb.append(d.getDate()).append(",").append(d.getGateIn()).append(",").append(d.getGateOut()).append("\n");
            }
        }
        sb.append("\n");

        // Container inventory
        ContainerInventoryResponse inventory = getContainerInventoryReport();
        sb.append("=== TỒN KHO CONTAINER ===\n");
        sb.append("Tổng container,").append(inventory.getTotalContainers()).append("\n");
        if (inventory.getByCargoType() != null && !inventory.getByCargoType().isEmpty()) {
            sb.append("Loại hàng,Số lượng\n");
            inventory.getByCargoType().forEach((name, count) ->
                    sb.append(name).append(",").append(count).append("\n"));
        }
        sb.append("\n");

        // Zone occupancy
        ZoneOccupancyReportResponse occupancy = getZoneOccupancyReport();
        sb.append("=== TỶ LỆ LẤP ĐẦY KHO ===\n");
        sb.append("Tổng sức chứa,").append(occupancy.getTotalCapacity()).append("\n");
        sb.append("Đang chiếm dụng,").append(occupancy.getTotalOccupied()).append("\n");
        sb.append("Tỷ lệ lấp đầy,").append(String.format("%.1f%%", occupancy.getOverallOccupancyRate() * 100)).append("\n");
        if (occupancy.getZones() != null && !occupancy.getZones().isEmpty()) {
            sb.append("Khu vực,Bãi,Sức chứa,Đang dùng,Tỷ lệ\n");
            for (var z : occupancy.getZones()) {
                sb.append(z.getZoneName()).append(",")
                        .append(z.getYardName()).append(",")
                        .append(z.getCapacitySlots()).append(",")
                        .append(z.getOccupiedSlots()).append(",")
                        .append(String.format("%.1f%%", z.getOccupancyRate() * 100)).append("\n");
            }
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Map<LocalDate, Long> toDateMap(List<Object[]> rows) {
        Map<LocalDate, Long> map = new LinkedHashMap<>();
        for (Object[] row : rows) {
            // row[0] may be java.sql.Date or LocalDate depending on driver
            LocalDate date = row[0] instanceof LocalDate ld ? ld
                    : ((java.sql.Date) row[0]).toLocalDate();
            map.put(date, (Long) row[1]);
        }
        return map;
    }

    private Map<String, Long> toStringLongMap(List<Object[]> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : rows) {
            map.put((String) row[0], (Long) row[1]);
        }
        return map;
    }
}

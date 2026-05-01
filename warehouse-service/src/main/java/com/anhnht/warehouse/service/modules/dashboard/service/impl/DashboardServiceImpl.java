package com.anhnht.warehouse.service.modules.dashboard.service.impl;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.modules.alert.repository.AlertRepository;
import com.anhnht.warehouse.service.modules.booking.repository.OrderRepository;
import com.anhnht.warehouse.service.modules.container.repository.ContainerRepository;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.AdminDashboardResponse;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.ContainerStatusCountDto;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.CustomerDashboardResponse;
import com.anhnht.warehouse.service.modules.dashboard.dto.response.ZoneOccupancyDto;
import com.anhnht.warehouse.service.modules.dashboard.service.DashboardService;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.GateInReceiptRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.gateout.repository.GateOutReceiptRepository;
import com.anhnht.warehouse.service.modules.yard.repository.YardZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final GateInReceiptRepository     gateInReceiptRepository;
    private final GateOutReceiptRepository    gateOutReceiptRepository;
    private final ContainerRepository         containerRepository;
    private final OrderRepository             orderRepository;
    private final AlertRepository             alertRepository;
    private final YardZoneRepository          yardZoneRepository;
    private final ContainerPositionRepository containerPositionRepository;
    private final YardStorageRepository       yardStorageRepository;

    @Override
    public AdminDashboardResponse getAdminDashboard() {
        LocalDate today = LocalDate.now();

        // Gate activity today
        long gateInToday  = gateInReceiptRepository.countByDate(today);
        long gateOutToday = gateOutReceiptRepository.countByDate(today);

        // Container counts
        long containersInYard = containerRepository.countByStatusStatusName("IN_YARD");
        long totalContainers  = containerRepository.count();

        // Overdue: expected exit date before today and still in yard
        long overdueContainers = yardStorageRepository
                .findWithExitOnOrBefore(today.minusDays(1))
                .stream()
                .filter(s -> {
                    String status = s.getContainer().getStatus() != null
                            ? s.getContainer().getStatus().getStatusName() : "";
                    return !"GATE_OUT".equalsIgnoreCase(status)
                            && !"EXPORTED".equalsIgnoreCase(status);
                })
                .count();

        // Orders
        long pendingOrders = orderRepository.countByStatusStatusName("PENDING");
        long totalOrders   = orderRepository.count();

        // Alerts
        long openAlerts     = alertRepository.countByStatus((short) 0);
        long criticalAlerts = alertRepository.countByStatusAndLevelLevelName((short) 0, "CRITICAL");

        // Container breakdown by status
        List<ContainerStatusCountDto> containersByStatus = containerRepository
                .countGroupedByStatus()
                .stream()
                .map(row -> new ContainerStatusCountDto((String) row[0], (Long) row[1]))
                .collect(Collectors.toList());

        // Zone occupancy
        List<ZoneOccupancyDto> zoneOccupancy = yardZoneRepository.findAll()
                .stream()
                .map(zone -> {
                    int  capacity  = zone.getCapacitySlots();
                    long occupied  = containerPositionRepository.countOccupiedInZone(zone.getZoneId());
                    double rate    = capacity > 0 ? (double) occupied / capacity : 0.0;
                    String yardName = zone.getYard() != null ? zone.getYard().getYardName() : "";
                    String yardType = (zone.getYard() != null && zone.getYard().getYardType() != null)
                            ? zone.getYard().getYardType().getYardTypeName() : "";
                    return new ZoneOccupancyDto(zone.getZoneId(), zone.getZoneName(),
                            yardName, yardType, capacity, occupied, rate);
                })
                .collect(Collectors.toList());

        // Financials
        java.math.BigDecimal totalRepair = containerRepository.sumRepairCost();
        if (totalRepair == null) totalRepair = java.math.BigDecimal.ZERO;
        
        java.math.BigDecimal totalComp = containerRepository.sumCompensationCost();
        if (totalComp == null) totalComp = java.math.BigDecimal.ZERO;

        return AdminDashboardResponse.builder()
                .gateInToday(gateInToday)
                .gateOutToday(gateOutToday)
                .containersInYard(containersInYard)
                .totalContainers(totalContainers)
                .overdueContainers(overdueContainers)
                .pendingOrders(pendingOrders)
                .totalOrders(totalOrders)
                .openAlerts(openAlerts)
                .criticalAlerts(criticalAlerts)
                .totalRepairCost(totalRepair)
                .totalCompensationCost(totalComp)
                .containersByStatus(containersByStatus)
                .zoneOccupancy(zoneOccupancy)
                .build();
    }

    @Override
    public CustomerDashboardResponse getCustomerDashboard(Integer userId) {
        long myContainersInYard = orderRepository.findContainerIdsInYardByCustomerId(userId).size();
        long myPendingOrders    = orderRepository.countByCustomerUserIdAndStatusStatusName(userId, "PENDING");
        long myTotalOrders      = orderRepository.countByCustomerUserId(userId);

        // Near-expiry: scoped to this customer's own in-yard containers only
        List<String> myContainerIds = orderRepository.findContainerIdsInYardByCustomerId(userId);
        List<String> nearExpiryContainerIds;
        if (myContainerIds.isEmpty()) {
            nearExpiryContainerIds = List.of();
        } else {
            LocalDate cutoff = LocalDate.now().plusDays(AppConstant.DEADLINE_WARN_DAYS);
            nearExpiryContainerIds = yardStorageRepository
                    .findWithExitOnOrBeforeForContainers(cutoff, myContainerIds)
                    .stream()
                    .map(s -> s.getContainer().getContainerId())
                    .collect(Collectors.toList());
        }

        return CustomerDashboardResponse.builder()
                .myContainersInYard(myContainersInYard)
                .myPendingOrders(myPendingOrders)
                .myTotalOrders(myTotalOrders)
                .nearExpiryContainerIds(nearExpiryContainerIds)
                .build();
    }
}

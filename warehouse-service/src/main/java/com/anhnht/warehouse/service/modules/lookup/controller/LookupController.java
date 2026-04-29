package com.anhnht.warehouse.service.modules.lookup.controller;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import com.anhnht.warehouse.service.modules.billing.repository.FeeConfigRepository;
import com.anhnht.warehouse.service.modules.container.dto.response.CargoTypeResponse;
import com.anhnht.warehouse.service.modules.container.dto.response.ContainerTypeResponse;
import com.anhnht.warehouse.service.modules.container.mapper.ContainerCatalogMapper;
import com.anhnht.warehouse.service.modules.container.service.ContainerCatalogService;
import com.anhnht.warehouse.service.modules.lookup.dto.FeeConfigResponse;
import com.anhnht.warehouse.service.modules.vessel.dto.response.VoyageResponse;
import com.anhnht.warehouse.service.modules.vessel.mapper.VesselMapper;
import com.anhnht.warehouse.service.modules.vessel.service.VoyageService;
import com.anhnht.warehouse.service.modules.yard.dto.response.YardTypeResponse;
import com.anhnht.warehouse.service.modules.yard.mapper.YardMapper;
import com.anhnht.warehouse.service.modules.yard.service.YardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Public endpoints — no authentication required (permitted in SecurityConfig).
 */
@Tag(name = "Tra cứu công khai", description = "API tra cứu không cần đăng nhập")
@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
public class LookupController {

    private final ContainerCatalogService catalogService;
    private final ContainerCatalogMapper  catalogMapper;
    private final VoyageService           voyageService;
    private final VesselMapper            vesselMapper;
    private final YardService             yardService;
    private final YardMapper              yardMapper;
    private final FeeConfigRepository     feeConfigRepository;

    @GetMapping("/container-types")
    public ResponseEntity<ApiResponse<List<ContainerTypeResponse>>> getContainerTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toContainerTypeResponses(catalogService.getAllContainerTypes())));
    }

    @GetMapping("/cargo-types")
    public ResponseEntity<ApiResponse<List<CargoTypeResponse>>> getCargoTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toCargoTypeResponses(catalogService.getAllCargoTypes())));
    }

    @GetMapping("/vessel-schedules")
    public ResponseEntity<ApiResponse<List<VoyageResponse>>> getVesselSchedules() {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toVoyageResponses(voyageService.findUpcoming())));
    }

    @GetMapping("/yard-types")
    public ResponseEntity<ApiResponse<List<YardTypeResponse>>> getYardTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardTypeResponses(yardService.getAllYardTypes())));
    }

    @GetMapping("/fee-config")
    public ResponseEntity<ApiResponse<FeeConfigResponse>> getFeeConfig() {
        FeeConfig db = feeConfigRepository.findAll().stream().findFirst().orElseGet(FeeConfig::new);
        FeeConfigResponse config = FeeConfigResponse.builder()
                .dailyStorageRate(db.getRatePerKgDefault() != null
                        ? db.getRatePerKgDefault().doubleValue() : AppConstant.STORAGE_DAILY_RATE)
                .overdueStorageRate(db.getOverduePenaltyRate() != null
                        ? db.getOverduePenaltyRate().doubleValue() : AppConstant.STORAGE_OVERDUE_RATE)
                .freeStorageDays(db.getFreeStorageDays() != null
                        ? db.getFreeStorageDays() : AppConstant.STORAGE_FREE_DAYS)
                .deadlineWarnDays(AppConstant.DEADLINE_WARN_DAYS)
                .deadlineUrgentDays(AppConstant.DEADLINE_URGENT_DAYS)
                .zoneOccupancyWarnThreshold(AppConstant.OCC_WARN_THRESHOLD)
                .zoneOccupancyCriticalThreshold(AppConstant.OCC_CRITICAL_THRESHOLD)
                .build();
        return ResponseEntity.ok(ApiResponse.success(config));
    }
}

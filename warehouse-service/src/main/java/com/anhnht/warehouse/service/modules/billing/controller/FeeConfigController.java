package com.anhnht.warehouse.service.modules.billing.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.billing.dto.request.FeeConfigRequest;
import com.anhnht.warehouse.service.modules.billing.dto.response.FeeConfigResponse;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import com.anhnht.warehouse.service.modules.billing.service.FeeConfigService;
import com.anhnht.warehouse.service.modules.billing.service.impl.FeeConfigServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Cấu hình phí", description = "Quản lý biểu phí lưu kho")
@RestController
@RequestMapping("/admin/fees")
@RequiredArgsConstructor
public class FeeConfigController {

    private final FeeConfigService        feeConfigService;
    private final FeeConfigServiceImpl    feeConfigServiceImpl; // needed for parseRates helper

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','CUSTOMER')")
    public ResponseEntity<ApiResponse<FeeConfigResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(toResponse(feeConfigService.get())));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<FeeConfigResponse>> update(@RequestBody FeeConfigRequest request) {
        return ResponseEntity.ok(ApiResponse.success(toResponse(feeConfigService.update(request))));
    }

    // ---- Mapper ----

    private FeeConfigResponse toResponse(FeeConfig entity) {
        FeeConfigResponse r = new FeeConfigResponse();
        r.setConfigId(entity.getConfigId());
        r.setCurrency(entity.getCurrency());
        r.setCostRate(entity.getCostRate());
        r.setRatePerKgDefault(entity.getRatePerKgDefault());
        r.setRatePerKgByCargoType(feeConfigServiceImpl.parseRates(entity.getRatePerKgByType()));
        r.setLiftingFeePerMove(entity.getLiftingFeePerMove());
        r.setOverduePenaltyRate(entity.getOverduePenaltyRate());
        r.setColdStorageSurcharge(entity.getColdStorageSurcharge());
        r.setHazmatSurcharge(entity.getHazmatSurcharge());
        r.setFreeStorageDays(entity.getFreeStorageDays());
        r.setStorageMultiplier(entity.getStorageMultiplier());
        r.setWeightMultiplier(entity.getWeightMultiplier());
        r.setContainerRate20ft(entity.getContainerRate20ft());
        r.setContainerRate40ft(entity.getContainerRate40ft());
        r.setEarlyPickupFee(entity.getEarlyPickupFee());
        r.setUpdatedAt(entity.getUpdatedAt());
        return r;
    }
}

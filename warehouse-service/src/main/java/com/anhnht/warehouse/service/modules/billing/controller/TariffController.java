package com.anhnht.warehouse.service.modules.billing.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.billing.dto.request.TariffRequest;
import com.anhnht.warehouse.service.modules.billing.dto.response.TariffResponse;
import com.anhnht.warehouse.service.modules.billing.entity.Tariff;
import com.anhnht.warehouse.service.modules.billing.service.TariffService;
import com.anhnht.warehouse.service.modules.container.entity.CargoType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/tariffs")
@RequiredArgsConstructor
public class TariffController {

    private final TariffService tariffService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','CUSTOMER')")
    public ResponseEntity<ApiResponse<List<TariffResponse>>> getAll() {
        List<TariffResponse> data = tariffService.getAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<TariffResponse>>> upsert(@RequestBody List<TariffRequest> requests) {
        List<TariffResponse> data = tariffService.upsert(requests).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    private TariffResponse toResponse(Tariff entity) {
        TariffResponse r = new TariffResponse();
        r.setTariffId(entity.getTariffId());
        r.setTariffCode(entity.getTariffCode());
        r.setTariffName(entity.getTariffName());
        r.setFeeType(entity.getFeeType());
        r.setContainerSize(entity.getContainerSize());
        r.setUnitPrice(entity.getUnitPrice());
        r.setUnit(entity.getUnit());
        r.setEffectiveDate(entity.getEffectiveDate());
        r.setNote(entity.getNote());
        CargoType cargoType = entity.getCargoType();
        if (cargoType != null) {
            r.setCargoTypeId(cargoType.getCargoTypeId());
            r.setCargoTypeName(cargoType.getCargoTypeName());
        }
        return r;
    }
}

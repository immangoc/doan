package com.anhnht.warehouse.service.modules.vessel.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.PageableUtils;
import com.anhnht.warehouse.service.modules.vessel.dto.request.VesselRequest;
import com.anhnht.warehouse.service.modules.vessel.dto.response.VesselResponse;
import com.anhnht.warehouse.service.modules.vessel.mapper.VesselMapper;
import com.anhnht.warehouse.service.modules.vessel.service.VesselService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Tàu", description = "Quản lý thông tin tàu")
@RestController
@RequestMapping("/admin/vessels")
@RequiredArgsConstructor
public class VesselController {

    private final VesselService vesselService;
    private final VesselMapper  vesselMapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<VesselResponse>>> getVessels(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "20")  int size,
            @RequestParam(defaultValue = "vesselId") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(vesselService.findAll(keyword, pageable)
                        .map(vesselMapper::toVesselResponse))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<VesselResponse>> getVessel(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toVesselResponse(vesselService.findById(id))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<VesselResponse>> createVessel(
            @Valid @RequestBody VesselRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                vesselMapper.toVesselResponse(vesselService.create(request))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<VesselResponse>> updateVessel(
            @PathVariable Integer id,
            @Valid @RequestBody VesselRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toVesselResponse(vesselService.update(id, request))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<Void>> deleteVessel(@PathVariable Integer id) {
        vesselService.delete(id);
        return ResponseEntity.ok(ApiResponse.noContent("Vessel deleted"));
    }
}

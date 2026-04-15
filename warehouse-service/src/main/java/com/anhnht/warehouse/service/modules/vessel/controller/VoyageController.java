package com.anhnht.warehouse.service.modules.vessel.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.PageableUtils;
import com.anhnht.warehouse.service.modules.vessel.dto.request.ManifestRequest;
import com.anhnht.warehouse.service.modules.vessel.dto.request.VoyageRequest;
import com.anhnht.warehouse.service.modules.vessel.dto.response.ManifestResponse;
import com.anhnht.warehouse.service.modules.vessel.dto.response.VoyageResponse;
import com.anhnht.warehouse.service.modules.vessel.mapper.VesselMapper;
import com.anhnht.warehouse.service.modules.vessel.service.VoyageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class VoyageController {

    private final VoyageService voyageService;
    private final VesselMapper  vesselMapper;

    // ============================================================
    // Voyages
    // ============================================================

    @GetMapping("/admin/voyages")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<VoyageResponse>>> getVoyages(
            @RequestParam(defaultValue = "0")        int page,
            @RequestParam(defaultValue = "20")       int size,
            @RequestParam(defaultValue = "voyageId") String sortBy,
            @RequestParam(defaultValue = "asc")      String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(voyageService.findAll(pageable)
                        .map(vesselMapper::toVoyageResponse))));
    }

    @GetMapping("/admin/voyages/upcoming")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<VoyageResponse>>> getUpcomingVoyages() {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toVoyageResponses(voyageService.findUpcoming())));
    }

    @GetMapping("/admin/vessels/{vesselId}/voyages")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<VoyageResponse>>> getVoyagesByVessel(
            @PathVariable Integer vesselId) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toVoyageResponses(voyageService.findByVesselId(vesselId))));
    }

    @GetMapping("/admin/voyages/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<VoyageResponse>> getVoyage(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toVoyageResponse(voyageService.findById(id))));
    }

    @PostMapping("/admin/voyages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoyageResponse>> createVoyage(
            @Valid @RequestBody VoyageRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                vesselMapper.toVoyageResponse(voyageService.create(request))));
    }

    @PutMapping("/admin/voyages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoyageResponse>> updateVoyage(
            @PathVariable Integer id,
            @Valid @RequestBody VoyageRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toVoyageResponse(voyageService.update(id, request))));
    }

    @DeleteMapping("/admin/voyages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteVoyage(@PathVariable Integer id) {
        voyageService.delete(id);
        return ResponseEntity.ok(ApiResponse.noContent("Voyage deleted"));
    }

    // ============================================================
    // Manifests (nested under voyage)
    // ============================================================

    @GetMapping("/admin/voyages/{voyageId}/manifests")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<ManifestResponse>>> getManifests(
            @PathVariable Integer voyageId) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toManifestResponses(voyageService.getManifests(voyageId))));
    }

    @GetMapping("/admin/manifests/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ManifestResponse>> getManifest(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toManifestResponse(voyageService.getManifestById(id))));
    }

    @PostMapping("/admin/voyages/{voyageId}/manifests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ManifestResponse>> createManifest(
            @PathVariable Integer voyageId,
            @Valid @RequestBody ManifestRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                vesselMapper.toManifestResponse(voyageService.createManifest(voyageId, request))));
    }

    @PutMapping("/admin/manifests/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ManifestResponse>> updateManifest(
            @PathVariable Integer id,
            @Valid @RequestBody ManifestRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                vesselMapper.toManifestResponse(voyageService.updateManifest(id, request))));
    }

    @DeleteMapping("/admin/manifests/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteManifest(@PathVariable Integer id) {
        voyageService.deleteManifest(id);
        return ResponseEntity.ok(ApiResponse.noContent("Manifest deleted"));
    }
}

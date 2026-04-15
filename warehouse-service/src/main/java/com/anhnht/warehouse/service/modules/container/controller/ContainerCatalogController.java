package com.anhnht.warehouse.service.modules.container.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.container.dto.request.*;
import com.anhnht.warehouse.service.modules.container.dto.response.*;
import com.anhnht.warehouse.service.modules.container.mapper.ContainerCatalogMapper;
import com.anhnht.warehouse.service.modules.container.service.ContainerCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class ContainerCatalogController {

    private final ContainerCatalogService catalogService;
    private final ContainerCatalogMapper  catalogMapper;

    // ============================================================
    // Container types
    // ============================================================

    @GetMapping("/container-types")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','CUSTOMER')")
    public ResponseEntity<ApiResponse<List<ContainerTypeResponse>>> getContainerTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toContainerTypeResponses(catalogService.getAllContainerTypes())));
    }

    @PostMapping("/container-types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ContainerTypeResponse>> createContainerType(
            @Valid @RequestBody ContainerTypeRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                catalogMapper.toContainerTypeResponse(
                        catalogService.createContainerType(request.getContainerTypeName()))));
    }

    @PutMapping("/container-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ContainerTypeResponse>> updateContainerType(
            @PathVariable Integer id,
            @Valid @RequestBody ContainerTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toContainerTypeResponse(
                        catalogService.updateContainerType(id, request.getContainerTypeName()))));
    }

    @DeleteMapping("/container-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteContainerType(@PathVariable Integer id) {
        catalogService.deleteContainerType(id);
        return ResponseEntity.ok(ApiResponse.noContent("Container type deleted"));
    }

    // ============================================================
    // Cargo types
    // ============================================================

    @GetMapping("/cargo-types")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','CUSTOMER')")
    public ResponseEntity<ApiResponse<List<CargoTypeResponse>>> getCargoTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toCargoTypeResponses(catalogService.getAllCargoTypes())));
    }

    @PostMapping("/cargo-types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CargoTypeResponse>> createCargoType(
            @Valid @RequestBody CargoTypeRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                catalogMapper.toCargoTypeResponse(
                        catalogService.createCargoType(request.getCargoTypeName()))));
    }

    @PutMapping("/cargo-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CargoTypeResponse>> updateCargoType(
            @PathVariable Integer id,
            @Valid @RequestBody CargoTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toCargoTypeResponse(
                        catalogService.updateCargoType(id, request.getCargoTypeName()))));
    }

    @DeleteMapping("/cargo-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCargoType(@PathVariable Integer id) {
        catalogService.deleteCargoType(id);
        return ResponseEntity.ok(ApiResponse.noContent("Cargo type deleted"));
    }

    // ============================================================
    // Cargo attributes
    // ============================================================

    @GetMapping("/cargo-attributes")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<CargoAttributeResponse>>> getCargoAttributes() {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toCargoAttributeResponses(catalogService.getAllCargoAttributes())));
    }

    @PostMapping("/cargo-attributes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CargoAttributeResponse>> createCargoAttribute(
            @Valid @RequestBody CargoAttributeRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                catalogMapper.toCargoAttributeResponse(
                        catalogService.createCargoAttribute(request.getAttributeName()))));
    }

    @PutMapping("/cargo-attributes/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CargoAttributeResponse>> updateCargoAttribute(
            @PathVariable Integer id,
            @Valid @RequestBody CargoAttributeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toCargoAttributeResponse(
                        catalogService.updateCargoAttribute(id, request.getAttributeName()))));
    }

    @DeleteMapping("/cargo-attributes/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCargoAttribute(@PathVariable Integer id) {
        catalogService.deleteCargoAttribute(id);
        return ResponseEntity.ok(ApiResponse.noContent("Cargo attribute deleted"));
    }

    // ============================================================
    // Container statuses (read-only)
    // ============================================================

    @GetMapping("/container-statuses")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<ContainerStatusResponse>>> getStatuses() {
        return ResponseEntity.ok(ApiResponse.success(
                catalogMapper.toContainerStatusResponses(catalogService.getAllStatuses())));
    }
}

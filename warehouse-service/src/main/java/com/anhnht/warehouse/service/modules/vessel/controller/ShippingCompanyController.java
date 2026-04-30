package com.anhnht.warehouse.service.modules.vessel.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.vessel.dto.request.ShippingCompanyRequest;
import com.anhnht.warehouse.service.modules.vessel.dto.response.ShippingCompanyResponse;
import com.anhnht.warehouse.service.modules.vessel.entity.ShippingCompany;
import com.anhnht.warehouse.service.modules.vessel.service.ShippingCompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Hãng tàu", description = "Quản lý thông tin hãng tàu")
@RestController
@RequestMapping("/admin/shipping-companies")
@RequiredArgsConstructor
public class ShippingCompanyController {

    private final ShippingCompanyService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<ShippingCompanyResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(service.findAll().stream()
                .map(this::toResponse).toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ShippingCompanyResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(toResponse(service.findById(id))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ShippingCompanyResponse>> create(
            @Valid @RequestBody ShippingCompanyRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                toResponse(service.create(request))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ShippingCompanyResponse>> update(
            @PathVariable Integer id,
            @Valid @RequestBody ShippingCompanyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                toResponse(service.update(id, request))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.noContent("Shipping company deleted"));
    }

    // ---- Mapper ----

    private ShippingCompanyResponse toResponse(ShippingCompany entity) {
        ShippingCompanyResponse r = new ShippingCompanyResponse();
        r.setCompanyId(entity.getCompanyId());
        r.setName(entity.getName());
        r.setPhone(entity.getPhone());
        r.setEmail(entity.getEmail());
        r.setAddress(entity.getAddress());
        r.setCode(entity.getCode());
        r.setCountry(entity.getCountry());
        r.setCreatedAt(entity.getCreatedAt());
        return r;
    }
}

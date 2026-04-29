package com.anhnht.warehouse.service.modules.yard.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.yard.dto.request.RelocationRequest;
import com.anhnht.warehouse.service.modules.yard.dto.request.SwapRequest;
import com.anhnht.warehouse.service.modules.yard.dto.response.RelocationResponse;
import com.anhnht.warehouse.service.modules.yard.dto.response.SwapResponse;
import com.anhnht.warehouse.service.modules.yard.service.RelocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Di dời container", description = "Di dời và hoán đổi vị trí container")
@RestController
@RequestMapping("/admin/yard")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
public class RelocationController {

    private final RelocationService relocationService;

    /**
     * POST /admin/yard/relocate
     * Move a container from its current slot to a new slot/tier.
     */
    @PostMapping("/relocate")
    public ResponseEntity<ApiResponse<RelocationResponse>> relocate(
            @Valid @RequestBody RelocationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(relocationService.relocate(request)));
    }

    /**
     * POST /admin/yard/swap
     * Atomically swap the slot/tier positions of two containers.
     */
    @PostMapping("/swap")
    public ResponseEntity<ApiResponse<SwapResponse>> swap(
            @Valid @RequestBody SwapRequest request) {
        return ResponseEntity.ok(ApiResponse.success(relocationService.swap(request)));
    }
}

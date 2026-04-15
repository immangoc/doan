package com.anhnht.warehouse.service.modules.optimization.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.optimization.dto.request.PlacementRequest;
import com.anhnht.warehouse.service.modules.optimization.dto.response.PlacementRecommendation;
import com.anhnht.warehouse.service.modules.optimization.service.OptimizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/optimization")
@RequiredArgsConstructor
public class OptimizationController {

    private final OptimizationService optimizationService;

    /**
     * POST /admin/optimization/recommend
     *
     * Returns Top-5 slot recommendations for placing a container.
     * Runs the full 4-module stacking algorithm pipeline.
     */
    @PostMapping("/recommend")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PlacementRecommendation>> recommend(
            @Valid @RequestBody PlacementRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                optimizationService.recommend(request)));
    }
}

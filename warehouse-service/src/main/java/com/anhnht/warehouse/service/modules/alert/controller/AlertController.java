package com.anhnht.warehouse.service.modules.alert.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.modules.alert.dto.response.AlertResponse;
import com.anhnht.warehouse.service.modules.alert.entity.Alert;
import com.anhnht.warehouse.service.modules.alert.mapper.AlertMapper;
import com.anhnht.warehouse.service.modules.alert.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/alerts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
public class AlertController {

    private final AlertService alertService;
    private final AlertMapper  alertMapper;

    /**
     * GET /admin/alerts?status=&levelName=
     * List all alerts with optional filters.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AlertResponse>>> findAll(
            @RequestParam(required = false) Short  status,
            @RequestParam(required = false) String levelName,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<AlertResponse> page = alertService.findAll(status, levelName, pageable)
                .map(alertMapper::toAlertResponse);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }

    /**
     * GET /admin/alerts/{id}
     * Get a single alert by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AlertResponse>> findById(@PathVariable Integer id) {
        Alert alert = alertService.findById(id);
        return ResponseEntity.ok(ApiResponse.success(alertMapper.toAlertResponse(alert)));
    }

    /**
     * PUT /admin/alerts/{id}/acknowledge
     * Acknowledge an open alert (status 0 → 1).
     */
    @PutMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<ApiResponse<AlertResponse>> acknowledge(@PathVariable Integer id) {
        Alert alert = alertService.acknowledge(id);
        return ResponseEntity.ok(ApiResponse.success("Alert acknowledged", alertMapper.toAlertResponse(alert)));
    }

    /**
     * GET /admin/alerts/zone/{zoneId}
     * All alerts for a specific zone.
     */
    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<ApiResponse<PageResponse<AlertResponse>>> findByZone(
            @PathVariable Integer zoneId,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<AlertResponse> page = alertService.findByZone(zoneId, pageable)
                .map(alertMapper::toAlertResponse);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }
}

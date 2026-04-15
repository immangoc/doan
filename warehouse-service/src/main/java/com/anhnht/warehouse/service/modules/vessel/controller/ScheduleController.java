package com.anhnht.warehouse.service.modules.vessel.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.vessel.dto.request.ScheduleRequest;
import com.anhnht.warehouse.service.modules.vessel.dto.response.ScheduleResponse;
import com.anhnht.warehouse.service.modules.vessel.entity.Schedule;
import com.anhnht.warehouse.service.modules.vessel.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(service.findAll().stream()
                .map(this::toResponse).toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ScheduleResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(toResponse(service.findById(id))));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ScheduleResponse>> create(
            @Valid @RequestBody ScheduleRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                toResponse(service.create(request))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ScheduleResponse>> update(
            @PathVariable Integer id,
            @Valid @RequestBody ScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(toResponse(service.update(id, request))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.noContent("Schedule deleted"));
    }

    // ---- Mapper ----

    private ScheduleResponse toResponse(Schedule entity) {
        ScheduleResponse r = new ScheduleResponse();
        r.setScheduleId(entity.getScheduleId());
        r.setCompanyName(entity.getCompanyName());
        r.setShipName(entity.getShipName());
        r.setType(entity.getType());
        r.setTimeStart(entity.getTimeStart());
        r.setTimeEnd(entity.getTimeEnd());
        r.setLocation(entity.getLocation());
        r.setContainers(entity.getContainers());
        r.setStatus(entity.getStatus());
        r.setCreatedAt(entity.getCreatedAt());
        r.setUpdatedAt(entity.getUpdatedAt());
        return r;
    }
}

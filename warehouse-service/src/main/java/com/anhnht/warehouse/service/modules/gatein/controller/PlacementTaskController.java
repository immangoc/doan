package com.anhnht.warehouse.service.modules.gatein.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.gatein.dto.request.ContainerPositionRequest;
import com.anhnht.warehouse.service.modules.gatein.dto.response.PlacementTaskResponse;
import com.anhnht.warehouse.service.modules.gatein.service.PlacementTaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Lệnh xếp chỗ", description = "Quản lý lệnh đẩy xuống cho nhân viên kho")
@RestController
@RequestMapping("/admin/placement-tasks")
@RequiredArgsConstructor
public class PlacementTaskController {

    private final PlacementTaskService placementTaskService;

    @PostMapping("/containers/{containerId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<PlacementTaskResponse>> createPlacementTask(
            @PathVariable String containerId,
            @Valid @RequestBody ContainerPositionRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                placementTaskService.createPlacementTask(containerId, request)));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<List<PlacementTaskResponse>>> getPendingTasks() {
        return ResponseEntity.ok(ApiResponse.success(placementTaskService.getPendingTasks()));
    }

    @PostMapping("/{taskId}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<Void>> confirmPlacementTask(@PathVariable Integer taskId) {
        placementTaskService.confirmPlacementTask(taskId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}

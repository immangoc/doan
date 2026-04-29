package com.anhnht.warehouse.service.modules.user.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.user.dto.response.PermissionResponse;
import com.anhnht.warehouse.service.modules.user.mapper.UserMapper;
import com.anhnht.warehouse.service.modules.user.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Quyền hạn", description = "Quản lý quyền hạn hệ thống")
@RestController
@RequestMapping("/admin/permissions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PermissionController {

    private final PermissionService permissionService;
    private final UserMapper        userMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAll() {
        List<PermissionResponse> permissions = permissionService.findAll().stream()
                .map(userMapper::toPermissionResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(permissions));
    }

    @GetMapping("/{permissionId}")
    public ResponseEntity<ApiResponse<PermissionResponse>> getById(
            @PathVariable Integer permissionId) {
        return ResponseEntity.ok(ApiResponse.success(
                userMapper.toPermissionResponse(permissionService.findById(permissionId))));
    }
}

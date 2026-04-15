package com.anhnht.warehouse.service.modules.user.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.user.dto.response.RoleResponse;
import com.anhnht.warehouse.service.modules.user.mapper.UserMapper;
import com.anhnht.warehouse.service.modules.user.service.RoleService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RoleController {

    private final RoleService roleService;
    private final UserMapper  userMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAll() {
        List<RoleResponse> roles = roleService.findAll().stream()
                .map(userMapper::toRoleResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(roles));
    }

    @GetMapping("/{roleId}")
    public ResponseEntity<ApiResponse<RoleResponse>> getById(@PathVariable Integer roleId) {
        return ResponseEntity.ok(ApiResponse.success(
                userMapper.toRoleResponse(roleService.findById(roleId))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoleResponse>> create(
            @RequestParam @NotBlank String roleName) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                userMapper.toRoleResponse(roleService.create(roleName))));
    }

    @PutMapping("/{roleId}")
    public ResponseEntity<ApiResponse<RoleResponse>> update(
            @PathVariable Integer roleId,
            @RequestParam @NotBlank String roleName) {
        return ResponseEntity.ok(ApiResponse.success(
                userMapper.toRoleResponse(roleService.update(roleId, roleName))));
    }

    @DeleteMapping("/{roleId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Integer roleId) {
        roleService.delete(roleId);
        return ResponseEntity.ok(ApiResponse.noContent("Role deleted"));
    }
}

package com.anhnht.warehouse.service.modules.user.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.dto.pagination.PageRequestDto;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.user.dto.request.*;
import com.anhnht.warehouse.service.modules.user.dto.response.*;
import com.anhnht.warehouse.service.modules.user.facade.UserFacade;
import com.anhnht.warehouse.service.modules.user.mapper.UserMapper;
import com.anhnht.warehouse.service.modules.user.service.SystemLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserFacade       userFacade;
    private final SystemLogService systemLogService;
    private final UserMapper       userMapper;

    // ============================================================
    // Own profile — any authenticated user
    // ============================================================

    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getMe() {
        return ResponseEntity.ok(ApiResponse.success(
                userFacade.getMe(SecurityUtils.getCurrentUserId())));
    }

    @PutMapping("/users/me")
    public ResponseEntity<ApiResponse<UserDetailResponse>> updateMe(
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userFacade.updateMe(SecurityUtils.getCurrentUserId(), request)));
    }

    @PutMapping("/users/me/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userFacade.updateMyProfile(SecurityUtils.getCurrentUserId(), request)));
    }

    @GetMapping("/users/me/addresses")
    public ResponseEntity<ApiResponse<List<UserAddressResponse>>> getMyAddresses() {
        return ResponseEntity.ok(ApiResponse.success(
                userFacade.getMyAddresses(SecurityUtils.getCurrentUserId())));
    }

    @PostMapping("/users/me/addresses")
    public ResponseEntity<ApiResponse<UserAddressResponse>> addMyAddress(
            @Valid @RequestBody UserAddressRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                userFacade.addMyAddress(SecurityUtils.getCurrentUserId(), request)));
    }

    @PutMapping("/users/me/addresses/{addressId}")
    public ResponseEntity<ApiResponse<UserAddressResponse>> updateMyAddress(
            @PathVariable Integer addressId,
            @Valid @RequestBody UserAddressRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userFacade.updateMyAddress(SecurityUtils.getCurrentUserId(), addressId, request)));
    }

    @DeleteMapping("/users/me/addresses/{addressId}")
    public ResponseEntity<ApiResponse<Void>> deleteMyAddress(
            @PathVariable Integer addressId) {
        userFacade.deleteMyAddress(SecurityUtils.getCurrentUserId(), addressId);
        return ResponseEntity.ok(ApiResponse.noContent("Address deleted"));
    }

    @GetMapping("/users/me/activity-log")
    public ResponseEntity<ApiResponse<PageResponse<SystemLogResponse>>> getMyActivityLog(
            @PageableDefault(size = 20) Pageable pageable) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(systemLogService.findByUserId(userId, pageable)
                        .map(userMapper::toSystemLogResponse))));
    }

    // ============================================================
    // Admin user management — ADMIN only
    // ============================================================

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> getAllUsers(
            @Valid PageRequestDto pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(userFacade.getAllUsers(pageRequest.toPageable()))));
    }

    @GetMapping("/admin/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getUserById(
            @PathVariable Integer userId) {
        return ResponseEntity.ok(ApiResponse.success(userFacade.getUserById(userId)));
    }

    @PostMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(userFacade.createUser(request)));
    }

    @PutMapping("/admin/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Integer userId,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userFacade.updateUser(userId, request)));
    }

    @PutMapping("/admin/users/{userId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateUserStatus(
            @PathVariable Integer userId,
            @RequestParam Integer status) {
        userFacade.updateUserStatus(userId, status);
        return ResponseEntity.ok(ApiResponse.noContent("User status updated"));
    }

    @PutMapping("/admin/users/{userId}/roles/{roleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assignRole(
            @PathVariable Integer userId,
            @PathVariable Integer roleId) {
        userFacade.assignRole(userId, roleId);
        return ResponseEntity.ok(ApiResponse.noContent("Role assigned"));
    }
}

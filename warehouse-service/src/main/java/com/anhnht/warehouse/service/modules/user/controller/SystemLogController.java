package com.anhnht.warehouse.service.modules.user.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.modules.user.dto.response.SystemLogResponse;
import com.anhnht.warehouse.service.modules.user.mapper.UserMapper;
import com.anhnht.warehouse.service.modules.user.service.SystemLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Nhật ký hệ thống", description = "Xem log hoạt động hệ thống")
@RestController
@RequestMapping("/admin/system-logs")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
public class SystemLogController {

    private final SystemLogService systemLogService;
    private final UserMapper       userMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SystemLogResponse>>> findAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(systemLogService.findAll(pageable)
                        .map(userMapper::toSystemLogResponse))));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<PageResponse<SystemLogResponse>>> findByUser(
            @PathVariable Integer userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(systemLogService.findByUserId(userId, pageable)
                        .map(userMapper::toSystemLogResponse))));
    }
}

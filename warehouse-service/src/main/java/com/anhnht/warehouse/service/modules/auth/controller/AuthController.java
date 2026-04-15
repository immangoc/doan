package com.anhnht.warehouse.service.modules.auth.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.auth.dto.request.*;
import com.anhnht.warehouse.service.modules.auth.dto.response.LoginResponse;
import com.anhnht.warehouse.service.modules.auth.facade.AuthFacade;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthFacade authFacade;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @Valid @RequestBody RegisterRequest request) {
        authFacade.register(request);
        return ResponseEntity.status(201)
                .body(ApiResponse.noContent("Registration successful — you can now log in"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authFacade.login(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String authHeader) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            authFacade.logout(authHeader.substring(7));
        }
        return ResponseEntity.ok(ApiResponse.noContent("Logged out successfully"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authFacade.forgotPassword(request);
        return ResponseEntity.ok(
                ApiResponse.noContent("If the email exists, an OTP has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authFacade.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.noContent("Password reset successfully"));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {
        authFacade.changePassword(SecurityUtils.getCurrentUserId(), request);
        return ResponseEntity.ok(ApiResponse.noContent("Password changed successfully"));
    }
}

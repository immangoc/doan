package com.anhnht.warehouse.service.modules.auth.facade;

import com.anhnht.warehouse.service.common.constant.RoleCode;
import com.anhnht.warehouse.service.common.exception.UnauthorizedException;
import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.security.jwt.JwtTokenProvider;
import com.anhnht.warehouse.service.infrastructure.redis.RedisCacheService;
import com.anhnht.warehouse.service.modules.auth.dto.request.*;
import com.anhnht.warehouse.service.modules.auth.dto.response.LoginResponse;
import com.anhnht.warehouse.service.modules.auth.service.AuthService;
import com.anhnht.warehouse.service.modules.user.entity.Role;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.service.SystemLogService;
import com.anhnht.warehouse.service.modules.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthFacade {

    private final AuthService       authService;
    private final UserService       userService;
    private final JwtTokenProvider  jwtTokenProvider;
    private final RedisCacheService redisCache;
    private final SystemLogService  systemLogService;

    public LoginResponse login(LoginRequest request) {
        User user = authService.validateCredentials(request.getEmail(), request.getPassword());
        String role  = resolvePrimaryRole(user);
        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getUserId(), role);

        systemLogService.log(user.getUserId(), "LOGIN", "User logged in");

        return LoginResponse.builder()
                .token(token)
                .expiresIn(jwtTokenProvider.getExpirationSeconds())
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(role)
                .build();
    }

    public void register(RegisterRequest request) {
        User user = userService.createCustomer(request);
        systemLogService.log(user.getUserId(), "REGISTER", "New customer account created");
    }

    public void logout(String token) {
        long ttl = jwtTokenProvider.getRemainingTtlSeconds(token);
        redisCache.blacklistToken(token, ttl);

        try {
            Integer userId = jwtTokenProvider.getUserIdFromToken(token);
            systemLogService.log(userId, "LOGOUT", "User logged out");
        } catch (Exception ignored) {
            // Token may already be invalid
        }
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        authService.sendPasswordResetOtp(request.getEmail());
    }

    public void resetPassword(ResetPasswordRequest request) {
        authService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
        systemLogService.log("RESET_PASSWORD", "Password reset for email: " + request.getEmail());
    }

    public void changePassword(Integer userId, ChangePasswordRequest request) {
        authService.changePassword(userId, request.getOldPassword(), request.getNewPassword());
        systemLogService.log(userId, "CHANGE_PASSWORD", "Password changed");
    }

    public String sendRegistrationOtp(String email) {
        return authService.sendRegistrationOtp(email);
    }

    public void verifyRegistrationOtp(String email, String otp) {
        authService.verifyRegistrationOtp(email, otp);
    }

    // ---- Private helpers ----

    private String resolvePrimaryRole(User user) {
        var roleNames = user.getRoles().stream()
                .map(Role::getRoleName)
                .toList();
        if (roleNames.contains(RoleCode.ADMIN))      return RoleCode.ADMIN;
        if (roleNames.contains(RoleCode.PLANNER))    return RoleCode.PLANNER;
        if (roleNames.contains(RoleCode.OPERATOR))   return RoleCode.OPERATOR;
        if (roleNames.contains(RoleCode.YARD_STAFF)) return RoleCode.YARD_STAFF;
        return RoleCode.CUSTOMER;
    }
}

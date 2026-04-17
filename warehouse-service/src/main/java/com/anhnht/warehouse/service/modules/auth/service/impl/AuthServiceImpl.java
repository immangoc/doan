package com.anhnht.warehouse.service.modules.auth.service.impl;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.UnauthorizedException;
import com.anhnht.warehouse.service.infrastructure.mail.MailService;
import com.anhnht.warehouse.service.infrastructure.redis.RedisCacheService;
import com.anhnht.warehouse.service.modules.auth.service.AuthService;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository    userRepository;
    private final PasswordEncoder   passwordEncoder;
    private final RedisCacheService redisCache;
    private final MailService       mailService;

    @Override
    @Transactional(readOnly = true)
    public User validateCredentials(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (user.getStatus() != 1) {
            throw new UnauthorizedException(ErrorCode.FORBIDDEN, "Account is inactive");
        }
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public void sendPasswordResetOtp(String email) {
        // Silently succeed even if email not found (prevents enumeration)
        userRepository.findByEmail(email).ifPresent(user -> {
            String otp = generateOtp();
            redisCache.saveOtp(email, otp, AppConstant.OTP_TTL_SECONDS);
            mailService.sendOtp(email, otp);
        });
    }

    @Override
    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        String storedOtp = redisCache.getOtp(email);
        if (storedOtp == null || !storedOtp.equals(otp)) {
            throw new BusinessException(ErrorCode.INVALID_OTP);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        redisCache.deleteOtp(email);
    }

    @Override
    @Transactional
    public void changePassword(Integer userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private static final String REG_OTP_PREFIX = "reg_otp:";

    @Override
    public void sendRegistrationOtp(String email) {
        String otp = generateOtp();
        redisCache.saveOtp(REG_OTP_PREFIX + email, otp, AppConstant.OTP_TTL_SECONDS);
        log.info("========== [DEV] Registration OTP for {}: {} ==========", email, otp);
        mailService.sendOtp(email, otp);
    }

    @Override
    public void verifyRegistrationOtp(String email, String otp) {
        String stored = redisCache.getOtp(REG_OTP_PREFIX + email);
        if (stored == null || !stored.equals(otp)) {
            throw new BusinessException(ErrorCode.INVALID_OTP);
        }
        redisCache.deleteOtp(REG_OTP_PREFIX + email);
    }

    // ---- Private helpers ----

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < AppConstant.OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }
}

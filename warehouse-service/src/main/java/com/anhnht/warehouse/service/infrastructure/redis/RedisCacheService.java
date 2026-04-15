package com.anhnht.warehouse.service.infrastructure.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisCacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String OTP_PREFIX       = "otp:";
    private static final String BLACKLIST_PREFIX  = "blacklist:";

    // --- OTP ---

    public void saveOtp(String email, String otp, long ttlSeconds) {
        redisTemplate.opsForValue().set(OTP_PREFIX + email, otp, ttlSeconds, TimeUnit.SECONDS);
    }

    public String getOtp(String email) {
        Object value = redisTemplate.opsForValue().get(OTP_PREFIX + email);
        return value != null ? value.toString() : null;
    }

    public void deleteOtp(String email) {
        redisTemplate.delete(OTP_PREFIX + email);
    }

    // --- Token blacklist ---

    public void blacklistToken(String token, long ttlSeconds) {
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + token, "1", ttlSeconds, TimeUnit.SECONDS);
    }

    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }

    // --- Generic ---

    public void set(String key, Object value, long ttlSeconds) {
        redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
    }

    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }

    public boolean hasKey(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}

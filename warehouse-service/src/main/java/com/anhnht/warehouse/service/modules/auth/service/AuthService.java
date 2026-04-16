package com.anhnht.warehouse.service.modules.auth.service;

import com.anhnht.warehouse.service.modules.user.entity.User;

public interface AuthService {

    /** Validates credentials by email and returns the authenticated user. Throws on failure. */
    User validateCredentials(String email, String password);

    /** Generates and stores an OTP for the given email, then sends it via email. */
    void sendPasswordResetOtp(String email);

    /** Validates OTP and updates the user's password. Deletes OTP on success. */
    void resetPassword(String email, String otp, String newPassword);

    /** Validates old password and updates to new password. */
    void changePassword(Integer userId, String oldPassword, String newPassword);

    /** Generates and stores a registration OTP for the given email, then sends it via email. */
    void sendRegistrationOtp(String email);

    /** Validates the registration OTP for the given email. Throws on failure. */
    void verifyRegistrationOtp(String email, String otp);
}

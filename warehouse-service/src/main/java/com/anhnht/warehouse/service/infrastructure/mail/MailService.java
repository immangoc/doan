package com.anhnht.warehouse.service.infrastructure.mail;

public interface MailService {

    void sendOtp(String to, String otp);

    void sendBookingStatusUpdate(String to, String bookingId, String status);

    void sendNotification(String to, String subject, String body);
}

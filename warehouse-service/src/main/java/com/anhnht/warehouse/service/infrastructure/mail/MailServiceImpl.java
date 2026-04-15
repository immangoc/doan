package com.anhnht.warehouse.service.infrastructure.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Override
    public void sendOtp(String to, String otp) {
        String subject = "[HT Port Logistics] Mã OTP đặt lại mật khẩu";
        String body    = "Mã OTP của bạn là: " + otp + "\n"
                       + "Mã có hiệu lực trong 15 phút.\n"
                       + "Vui lòng không chia sẻ mã này với bất kỳ ai.";
        send(to, subject, body);
    }

    @Override
    public void sendBookingStatusUpdate(String to, String bookingId, String status) {
        String subject = "[HT Port Logistics] Cập nhật đơn hàng #" + bookingId;
        String body    = "Đơn hàng #" + bookingId + " của bạn đã được cập nhật sang trạng thái: " + status + ".\n"
                       + "Vui lòng đăng nhập để xem chi tiết.";
        send(to, subject, body);
    }

    @Override
    public void sendNotification(String to, String subject, String body) {
        send(to, subject, body);
    }

    // -------------------------------------------------------

    private void send(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            log.info("Email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}

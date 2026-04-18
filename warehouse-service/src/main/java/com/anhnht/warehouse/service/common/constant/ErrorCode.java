package com.anhnht.warehouse.service.common.constant;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // General
    SUCCESS("SUCCESS", "Operation successful"),
    BAD_REQUEST("BAD_REQUEST", "Invalid request"),
    NOT_FOUND("NOT_FOUND", "Resource not found"),
    UNAUTHORIZED("UNAUTHORIZED", "Authentication required"),
    FORBIDDEN("FORBIDDEN", "Access denied"),
    INTERNAL_ERROR("INTERNAL_ERROR", "An unexpected error occurred"),

    // Auth
    INVALID_CREDENTIALS("INVALID_CREDENTIALS", "Invalid username or password"),
    TOKEN_EXPIRED("TOKEN_EXPIRED", "Token has expired"),
    TOKEN_INVALID("TOKEN_INVALID", "Invalid token"),
    TOKEN_BLACKLISTED("TOKEN_BLACKLISTED", "Token has been invalidated"),
    USER_NOT_FOUND("USER_NOT_FOUND", "User not found"),
    EMAIL_ALREADY_EXISTS("EMAIL_ALREADY_EXISTS", "Email is already registered"),
    USERNAME_ALREADY_EXISTS("USERNAME_ALREADY_EXISTS", "Username is already taken"),
    INVALID_OTP("INVALID_OTP", "Invalid or expired OTP"),

    // Booking / Order
    BOOKING_NOT_FOUND("BOOKING_NOT_FOUND", "Booking not found"),
    BOOKING_CANNOT_CANCEL("BOOKING_CANNOT_CANCEL", "Booking cannot be cancelled in its current status"),
    BOOKING_ALREADY_PROCESSED("BOOKING_ALREADY_PROCESSED", "Booking has already been processed"),

    // Container
    CONTAINER_NOT_FOUND("CONTAINER_NOT_FOUND", "Container not found"),
    CONTAINER_ALREADY_EXISTS("CONTAINER_ALREADY_EXISTS", "Container ID already exists"),
    CONTAINER_NOT_IN_YARD("CONTAINER_NOT_IN_YARD", "Container is not currently in the yard"),
    CONTAINER_ALREADY_EXPORTED("CONTAINER_ALREADY_EXPORTED", "Container has already been exported"),

    // Yard / Slot
    SLOT_NOT_FOUND("SLOT_NOT_FOUND", "Slot not found"),
    SLOT_OCCUPIED("SLOT_OCCUPIED", "Slot and tier are already occupied"),
    SLOT_INFEASIBLE("SLOT_INFEASIBLE", "No feasible slot available for this container"),
    YARD_FULL("YARD_FULL", "Yard is at full capacity"),
    COLD_ZONE_FULL("COLD_ZONE_FULL", "Cold storage zone is at full capacity — manual intervention required"),
    CARGO_ZONE_MISMATCH("CARGO_ZONE_MISMATCH", "Cargo type does not match the yard zone type"),
    DEADLINE_BLOCK("DEADLINE_BLOCK", "Slot blocked: container below has an imminent export deadline"),
    CONCURRENT_FULL("CONCURRENT_FULL", "Yard capacity changed during processing — please retry"),

    // General conflict
    ALREADY_EXISTS("ALREADY_EXISTS", "Resource already exists"),

    // Alert
    ALERT_NOT_FOUND("ALERT_NOT_FOUND", "Alert not found"),

    // Billing
    INVOICE_NOT_FOUND("INVOICE_NOT_FOUND", "Invoice not found"),

    // Wallet / Payment
    WALLET_NOT_FOUND("WALLET_NOT_FOUND", "Wallet not found"),
    WALLET_INSUFFICIENT_BALANCE("WALLET_INSUFFICIENT_BALANCE", "Insufficient wallet balance"),
    PAYMENT_NOT_FOUND("PAYMENT_NOT_FOUND", "Payment not found"),
    PAYMENT_ALREADY_PROCESSED("PAYMENT_ALREADY_PROCESSED", "Payment already processed"),
    PAYMENT_AMOUNT_INVALID("PAYMENT_AMOUNT_INVALID", "Invalid payment amount"),
    PAYMENT_AMOUNT_MISMATCH("PAYMENT_AMOUNT_MISMATCH", "Payment amount mismatch"),
    PAYMENT_GATEWAY_ERROR("PAYMENT_GATEWAY_ERROR", "Payment gateway error"),
    PAYMENT_LINK_CREATION_FAILED("PAYMENT_LINK_CREATION_FAILED", "Payment link creation failed"),
    WEBHOOK_SIGNATURE_INVALID("WEBHOOK_SIGNATURE_INVALID", "Invalid webhook signature"),
    WITHDRAW_REQUEST_NOT_FOUND("WITHDRAW_REQUEST_NOT_FOUND", "Withdraw request not found"),
    WITHDRAW_REQUEST_INVALID_STATE("WITHDRAW_REQUEST_INVALID_STATE", "Withdraw request is not in a state that allows this action");

    private final String code;
    private final String defaultMessage;
}

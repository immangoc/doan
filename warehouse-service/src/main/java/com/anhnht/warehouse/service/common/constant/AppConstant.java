package com.anhnht.warehouse.service.common.constant;

public final class AppConstant {

    private AppConstant() {}

    // Auth
    public static final String AUTH_HEADER   = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";

    // OTP
    public static final long OTP_TTL_SECONDS = 900L; // 15 minutes
    public static final int  OTP_LENGTH      = 6;

    // Pagination
    public static final int DEFAULT_PAGE = 0;
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE     = 100;

    // Algorithm — deadline thresholds (configurable, defaults here)
    public static final int DEADLINE_HARD_DAYS   = 3; // T_HARD: slot infeasible if below container exits in ≤3 days
    public static final int DEADLINE_WARN_DAYS   = 7; // T_WARN: generate WARNING alert
    public static final int DEADLINE_URGENT_DAYS = 3; // T_URGENT: generate CRITICAL alert

    // Algorithm — occupancy thresholds
    public static final double OCC_WARN_THRESHOLD     = 0.80;
    public static final double OCC_CRITICAL_THRESHOLD = 0.90;

    // Algorithm — relocation
    public static final int MAX_RELOCATION_DEPTH = 4;

    // Algorithm — weight constraints
    public static final double MAX_STACK_WEIGHT_TONS = 60.0;
    public static final double WEIGHT_CRUSH_RATIO    = 1.5;

    // Algorithm — final score penalty weights
    public static final double LAMBDA   = 0.15; // relocation moves
    public static final double MU       = 0.10; // exit distance (normal)
    public static final double MU_HIGH  = 0.20; // exit distance (when occupancy ≥ 90%)
    public static final double NU       = 0.12; // future block score
    public static final double MAX_FUTURE_BLOCK = 2.0;

    // Billing — storage fee (USD per day)
    public static final double STORAGE_DAILY_RATE       = 50.0;
    public static final double STORAGE_OVERDUE_RATE     = 100.0; // double rate when overdue
    public static final int    STORAGE_FREE_DAYS        = 3;     // grace period before billing

    // Alert types
    public static final String ALERT_COLD_FULL     = "COLD_FULL";
    public static final String ALERT_UPCOMING_EXIT = "UPCOMING_EXIT";
    public static final String ALERT_URGENT_EXIT   = "URGENT_EXIT";
    public static final String ALERT_OVERDUE       = "OVERDUE";
    public static final String ALERT_ZONE_WARNING  = "ZONE_WARNING";
    public static final String ALERT_ZONE_CRITICAL = "ZONE_CRITICAL";
}

package com.anhnht.warehouse.service.common.util;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class DateTimeUtils {

    private DateTimeUtils() {}

    public static long daysBetween(LocalDate from, LocalDate to) {
        return ChronoUnit.DAYS.between(from, to);
    }

    /** Days remaining from today until the given date. Negative means overdue. */
    public static long daysFromToday(LocalDate date) {
        return ChronoUnit.DAYS.between(LocalDate.now(), date);
    }

    public static boolean isOverdue(LocalDate endDate) {
        return endDate != null && LocalDate.now().isAfter(endDate);
    }

    public static boolean isWithinDays(LocalDate endDate, int days) {
        if (endDate == null) return false;
        long remaining = daysFromToday(endDate);
        return remaining >= 0 && remaining <= days;
    }

    /** exit_urgency = 1 / max(days_to_exit, 1)  (algorithm formula) */
    public static double exitUrgency(LocalDate endDate) {
        if (endDate == null) return 0.0;
        long days = Math.max(daysFromToday(endDate), 1L);
        return 1.0 / days;
    }
}

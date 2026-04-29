package com.anhnht.warehouse.service.modules.booking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderExportDateFeeResponse {

    private Integer orderId;
    private LocalDate currentExportDate;
    private LocalDate newExportDate;

    /** Number of days the new date is later than the original. Negative if earlier. */
    private long dayDiff;

    /** "LATE" if pickup is later than original, "EARLY" if earlier, "SAME" if no change. */
    private String changeType;

    /** Fee charged in VND. Zero if no change. */
    private BigDecimal fee;

    /** Free storage days from FeeConfig. Used for late-fee discount window. */
    private Integer freeStorageDays;

    /** Wallet balance after the fee is deducted (only set when confirmPayment=true). */
    private BigDecimal walletBalanceAfter;

    /** Whether the fee was actually charged or this is just a preview. */
    private boolean charged;

    private String currency;
}

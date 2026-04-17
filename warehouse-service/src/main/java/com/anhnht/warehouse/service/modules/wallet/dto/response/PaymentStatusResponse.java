package com.anhnht.warehouse.service.modules.wallet.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class PaymentStatusResponse {

    private UUID paymentId;
    private Long orderCode;
    private BigDecimal amount;
    private String status;
    private LocalDateTime paidAt;
}

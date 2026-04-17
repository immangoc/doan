package com.anhnht.warehouse.service.modules.wallet.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class PaymentLinkResponse {

    private UUID paymentId;
    private Long orderCode;
    private String paymentLinkId;
    private BigDecimal amount;
    private String checkoutUrl;
    private String qrCode;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}

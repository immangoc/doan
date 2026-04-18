package com.anhnht.warehouse.service.modules.wallet.dto.response;

import com.anhnht.warehouse.service.modules.wallet.entity.WalletTransactionType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class WalletTransactionResponse {

    private UUID transactionId;
    private WalletTransactionType type;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String note;
    private LocalDateTime createdAt;
    private Long paymentOrderCode;
    private String paymentStatus;
}

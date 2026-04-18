package com.anhnht.warehouse.service.modules.wallet.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class WithdrawRequestResponse {

    private UUID id;

    @JsonProperty("user_name")
    private String userName;

    private String reason;
    private BigDecimal amount;

    @JsonProperty("bank_name")
    private String bankName;

    @JsonProperty("bank_account")
    private String bankAccount;

    private String status;

    @JsonProperty("transaction_code")
    private String transactionCode;

    @JsonProperty("reject_reason")
    private String rejectReason;

    @JsonProperty("processed_at")
    private LocalDateTime processedAt;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}

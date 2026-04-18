package com.anhnht.warehouse.service.modules.wallet.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class CreateWithdrawRequestDto {

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @NotBlank(message = "Reason is required")
    @Size(max = 500)
    private String reason;

    @NotBlank(message = "Bank name is required")
    @Size(max = 100)
    @JsonProperty("bank_name")
    private String bankName;

    @NotBlank(message = "Bank account is required")
    @Size(max = 100)
    @JsonProperty("bank_account")
    private String bankAccount;
}

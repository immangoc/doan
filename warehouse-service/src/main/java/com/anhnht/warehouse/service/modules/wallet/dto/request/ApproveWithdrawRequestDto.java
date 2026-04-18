package com.anhnht.warehouse.service.modules.wallet.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApproveWithdrawRequestDto {

    @NotBlank(message = "Transaction code is required")
    @Size(max = 100)
    @JsonProperty("transaction_code")
    private String transactionCode;
}

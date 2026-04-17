package com.anhnht.warehouse.service.modules.wallet.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class WalletBalanceResponse {

    private Integer walletId;
    private BigDecimal balance;
    private LocalDateTime updatedAt;
}

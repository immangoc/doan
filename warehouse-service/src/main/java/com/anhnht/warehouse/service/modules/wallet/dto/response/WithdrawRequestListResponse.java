package com.anhnht.warehouse.service.modules.wallet.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class WithdrawRequestListResponse {
    private List<WithdrawRequestResponse> items;
}

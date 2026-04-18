package com.anhnht.warehouse.service.modules.wallet.service;

import com.anhnht.warehouse.service.modules.wallet.dto.request.ApproveWithdrawRequestDto;
import com.anhnht.warehouse.service.modules.wallet.dto.request.CreateWithdrawRequestDto;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WithdrawRequestListResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.WithdrawRequestResponse;

import java.util.UUID;

public interface WithdrawRequestService {

    WithdrawRequestResponse create(Integer userId, CreateWithdrawRequestDto request);

    WithdrawRequestListResponse listAll();

    WithdrawRequestResponse approve(Integer adminId, UUID requestId, ApproveWithdrawRequestDto request);
}

package com.anhnht.warehouse.service.modules.wallet.service;

import com.anhnht.warehouse.service.modules.wallet.dto.request.CreateTopupRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.request.PayOSWebhookRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentLinkResponse;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PaymentStatusResponse;

public interface WalletPaymentService {

    PaymentLinkResponse createTopupLink(Integer userId, CreateTopupRequest request);

    PaymentStatusResponse getTopupStatus(Integer userId, Long orderCode);

    void cancelTopup(Integer userId, Long orderCode);

    void processWebhook(PayOSWebhookRequest webhook);
}

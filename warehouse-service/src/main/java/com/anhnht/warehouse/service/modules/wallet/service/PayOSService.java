package com.anhnht.warehouse.service.modules.wallet.service;

import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.wallet.dto.request.PayOSWebhookRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PayOSLinkResult;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PayOSPaymentStatus;

import java.math.BigDecimal;

public interface PayOSService {

    PayOSLinkResult createPaymentLink(User user, Long orderCode, BigDecimal amount,
                                     String description, String returnUrl, String cancelUrl);

    PayOSPaymentStatus getPaymentStatus(Long orderCode);

    void cancelPaymentLink(Long orderCode);

    boolean verifyWebhookSignature(PayOSWebhookRequest webhook);
}

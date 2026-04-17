package com.anhnht.warehouse.service.modules.wallet.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PayOSWebhookRequest {

    private String code;
    private String desc;
    private String signature;
    private WebhookData data;

    @Getter
    @Setter
    public static class WebhookData {
        private long orderCode;
        private int amount;
        private String code;
        private String desc;
    }
}

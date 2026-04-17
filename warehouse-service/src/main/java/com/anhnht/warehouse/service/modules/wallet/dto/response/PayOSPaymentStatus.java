package com.anhnht.warehouse.service.modules.wallet.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PayOSPaymentStatus {

    private String status;
    private String paymentLinkId;
    private String checkoutUrl;
    private String qrCode;
    private Integer amount;
    private String rawResponse;
}

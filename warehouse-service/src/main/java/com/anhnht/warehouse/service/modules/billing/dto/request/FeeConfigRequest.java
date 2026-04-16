package com.anhnht.warehouse.service.modules.billing.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
public class FeeConfigRequest {
    private String              currency;
    private BigDecimal          costRate;
    private BigDecimal          ratePerKgDefault;
    private Map<String, Double> ratePerKgByCargoType;
    private BigDecimal          liftingFeePerMove;
    private BigDecimal          overduePenaltyRate;
    private BigDecimal          coldStorageSurcharge;
    private BigDecimal          hazmatSurcharge;
    private Integer             freeStorageDays;
    private BigDecimal          storageMultiplier;
    private BigDecimal          weightMultiplier;
    private BigDecimal          containerRate20ft;
    private BigDecimal          containerRate40ft;
    private BigDecimal          earlyPickupFee;
}

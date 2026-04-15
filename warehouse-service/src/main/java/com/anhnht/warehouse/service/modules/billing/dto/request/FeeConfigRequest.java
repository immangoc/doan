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
}

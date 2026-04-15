package com.anhnht.warehouse.service.modules.billing.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
public class FeeConfigResponse {
    private Integer             configId;
    private String              currency;
    private BigDecimal          costRate;
    private BigDecimal          ratePerKgDefault;
    private Map<String, Double> ratePerKgByCargoType;
    private LocalDateTime       updatedAt;
}

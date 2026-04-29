package com.anhnht.warehouse.service.modules.billing.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class TariffResponse {
    private Integer tariffId;
    private String tariffCode;
    private String tariffName;
    private String feeType;
    private Integer containerSize;
    private Integer cargoTypeId;
    private String cargoTypeName;
    private BigDecimal unitPrice;
    private String unit;
    private LocalDate effectiveDate;
    private String note;
}

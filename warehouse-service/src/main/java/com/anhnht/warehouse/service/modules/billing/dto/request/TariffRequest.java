package com.anhnht.warehouse.service.modules.billing.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class TariffRequest {
    private String tariffCode;
    private String tariffName;
    private String feeType;
    private Integer containerSize;
    private String cargoTypeName;
    private BigDecimal unitPrice;
    private String unit;
    private LocalDate effectiveDate;
    private String note;
}

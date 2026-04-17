package com.anhnht.warehouse.service.modules.gatein.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class GateInReceiptResponse {

    private Integer       gateInId;
    private String        containerId;
    private Integer       voyageId;
    private String        voyageNo;
    private LocalDateTime gateInTime;
    private Integer       createdById;
    private String        createdByUsername;
    private String        operatorName;
    private String        note;

    // Virtual UI mapping fields (filled by controller after position lookup)
    private String        cargoTypeName;
    private String        containerTypeName;
    private BigDecimal    grossWeight;
    private String        statusName;
    private String        yardName;
    private String        zoneName;
    private String        blockName;
    private Integer       rowNo;
    private Integer       bayNo;
    private Integer       tier;
}

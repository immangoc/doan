package com.anhnht.warehouse.service.modules.container.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class ContainerResponse {

    private String        containerId;
    private Integer       manifestId;
    private String        containerTypeName;
    private String        statusName;
    private String        cargoTypeName;
    private String        attributeName;
    private BigDecimal    grossWeight;
    private String        sealNumber;
    private String        note;
    private LocalDateTime createdAt;

    // Damage tracking fields
    private String        repairStatus;
    private LocalDateTime repairDate;
    private BigDecimal    compensationCost;

    // Position fields (populated when container has an assigned slot)
    private String  yardName;
    private String  yardType;
    private String  zoneName;
    private String  blockName;
    private Integer rowNo;
    private Integer bayNo;
    private Integer tier;
}

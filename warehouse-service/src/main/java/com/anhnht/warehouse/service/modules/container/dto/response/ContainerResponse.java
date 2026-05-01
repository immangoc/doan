package com.anhnht.warehouse.service.modules.container.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class ContainerResponse {

    private String containerId;
    private Integer manifestId;
    private String containerTypeName;
    private String statusName;
    private String cargoTypeName;
    private String attributeName;
    private BigDecimal grossWeight;
    private BigDecimal declaredValue;
    private String sealNumber;
    private String note;
    private LocalDateTime createdAt;

    // Position fields (populated when container has an assigned slot, or last
    // known position snapshot from GateOutReceipt for gated-out containers)
    private String yardName;
    private String yardType;
    private String zoneName;
    private String blockName;
    private Integer rowNo;
    private Integer bayNo;
    private Integer tier;

    // Populated for gated-out containers (status = GATE_OUT)
    private LocalDateTime gateOutTime;

    /** Expected exit date from YardStorage. Null when no storage record exists. */
    private LocalDate expectedExitDate;

    /**
     * True when this container is attached to at least one active (non-terminal)
     * order.
     */
    private boolean inActiveOrder;
    
    /** The ID of the active order containing this container, if any. */
    private Integer activeOrderId;

    // Damage tracking fields (from V18 migration)
    private String repairStatus;
    private LocalDateTime repairDate;
    private BigDecimal compensationCost;
    private BigDecimal repairCost;
}

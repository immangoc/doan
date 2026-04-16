package com.anhnht.warehouse.service.modules.optimization.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Request for slot placement recommendations.
 *
 * Either containerId (look up from DB) OR cargoTypeName + grossWeight must be provided.
 */
@Getter
@Setter
public class PlacementRequest {

    /** Existing registered container — cargo type and weight resolved from DB. */
    @Size(max = 20)
    private String containerId;

    /**
     * Direct cargo type name (used when containerId is not provided).
     * Must exactly match seed values: 'Hàng Khô', 'Hàng Lạnh', 'Hàng Dễ Vỡ', 'Hàng Nguy Hiểm'.
     */
    private String cargoTypeName;

    @DecimalMin("0.0")
    private BigDecimal grossWeight;
}

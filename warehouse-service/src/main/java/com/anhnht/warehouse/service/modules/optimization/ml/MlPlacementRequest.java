package com.anhnht.warehouse.service.modules.optimization.ml;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MlPlacementRequest(
        String containerId,
        String cargoTypeName,
        BigDecimal grossWeight,
        String sizeType
) {}

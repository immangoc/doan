package com.anhnht.warehouse.service.modules.container.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class DamageDetailsRequest {

    @Size(max = 50)
    private String repairStatus;

    private LocalDateTime repairDate;

    private BigDecimal compensationCost;
}

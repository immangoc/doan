package com.anhnht.warehouse.service.modules.yard.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SlotRequest {

    @NotNull @Min(1) private Integer rowNo;
    @NotNull @Min(1) private Integer bayNo;

    @Min(value = 1, message = "maxTier must be at least 1")
    private Integer maxTier = 5;
}

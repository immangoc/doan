package com.anhnht.warehouse.service.modules.gatein.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContainerPositionRequest {

    @NotNull
    private Integer slotId;

    @NotNull
    @Min(1)
    private Integer tier;
}

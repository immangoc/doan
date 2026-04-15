package com.anhnht.warehouse.service.modules.yard.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RelocationRequest {

    @NotBlank
    private String containerId;

    @NotNull
    private Integer targetSlotId;

    @NotNull
    @Min(1)
    private Integer targetTier;
}

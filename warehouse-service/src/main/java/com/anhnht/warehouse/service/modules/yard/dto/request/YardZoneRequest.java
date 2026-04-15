package com.anhnht.warehouse.service.modules.yard.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class YardZoneRequest {

    @NotBlank(message = "Zone name is required")
    @Size(max = 50)
    private String zoneName;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacitySlots;
}

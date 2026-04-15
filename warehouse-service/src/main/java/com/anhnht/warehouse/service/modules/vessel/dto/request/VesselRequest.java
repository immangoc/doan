package com.anhnht.warehouse.service.modules.vessel.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VesselRequest {

    @NotBlank(message = "Vessel name is required")
    @Size(max = 100)
    private String vesselName;

    @Size(max = 100)
    private String shippingLine;
}

package com.anhnht.warehouse.service.modules.container.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CargoTypeRequest {

    @NotBlank(message = "Cargo type name is required")
    @Size(max = 100)
    private String cargoTypeName;
}

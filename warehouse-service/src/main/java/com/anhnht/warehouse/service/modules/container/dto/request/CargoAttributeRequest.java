package com.anhnht.warehouse.service.modules.container.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CargoAttributeRequest {

    @NotBlank(message = "Attribute name is required")
    @Size(max = 100)
    private String attributeName;
}

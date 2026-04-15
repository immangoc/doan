package com.anhnht.warehouse.service.modules.container.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContainerTypeRequest {

    @NotBlank(message = "Container type name is required")
    @Size(max = 50)
    private String containerTypeName;
}

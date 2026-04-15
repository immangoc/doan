package com.anhnht.warehouse.service.modules.yard.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class YardRequest {

    @NotNull(message = "Yard type ID is required")
    private Integer yardTypeId;

    @NotBlank(message = "Yard name is required")
    @Size(max = 100)
    private String yardName;

    @Size(max = 255)
    private String address;
}

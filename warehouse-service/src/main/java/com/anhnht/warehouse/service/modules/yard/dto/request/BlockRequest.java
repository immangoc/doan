package com.anhnht.warehouse.service.modules.yard.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BlockRequest {

    private Integer blockTypeId; // optional — links to seeded block_types

    @NotBlank(message = "Block name is required")
    @Size(max = 50)
    private String blockName;
}

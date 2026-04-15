package com.anhnht.warehouse.service.modules.yard.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SwapRequest {

    @NotBlank
    private String containerIdA;

    @NotBlank
    private String containerIdB;
}

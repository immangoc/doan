package com.anhnht.warehouse.service.modules.gateout.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GateOutRequest {

    @NotBlank
    @Size(max = 20)
    private String containerId;

    @Size(max = 255)
    private String note;
}

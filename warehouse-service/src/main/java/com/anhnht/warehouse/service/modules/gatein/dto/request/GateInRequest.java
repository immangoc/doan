package com.anhnht.warehouse.service.modules.gatein.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GateInRequest {

    @NotBlank
    @Size(max = 20)
    private String containerId;

    /** Optional: link to voyage manifest. */
    private Integer voyageId;

    /** Optional: assign to yard immediately on gate-in. */
    @NotNull
    private Integer yardId;

    @Size(max = 255)
    private String note;
}

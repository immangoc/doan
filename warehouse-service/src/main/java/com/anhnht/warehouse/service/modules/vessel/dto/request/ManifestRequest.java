package com.anhnht.warehouse.service.modules.vessel.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ManifestRequest {

    @Size(max = 255)
    private String note;
}

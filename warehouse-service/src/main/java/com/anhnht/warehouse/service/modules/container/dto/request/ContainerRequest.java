package com.anhnht.warehouse.service.modules.container.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ContainerRequest {

    @NotBlank
    @Size(max = 20)
    private String containerId;       // e.g. "ABCU1234567"

    private Integer manifestId;
    private Integer containerTypeId;
    private Integer cargoTypeId;
    private Integer attributeId;

    private BigDecimal grossWeight;

    @Size(max = 50)
    private String sealNumber;

    @Size(max = 255)
    private String note;
}

package com.anhnht.warehouse.service.modules.container.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExportPriorityRequest {

    @Min(1)
    @Max(10)
    private Integer priorityLevel = 1;

    private String note;
}

package com.anhnht.warehouse.service.modules.container.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExportPriorityResponse {

    private Integer priorityId;
    private String  containerId;
    private Integer priorityLevel;
    private String  note;
}

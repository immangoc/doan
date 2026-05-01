package com.anhnht.warehouse.service.modules.alert.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class IncidentReportRequest {

    @NotBlank(message = "Mức độ không được để trống")
    private String levelName;   // INFO, WARNING, CRITICAL

    @NotBlank(message = "Mô tả không được để trống")
    private String description;

    private String containerId; // optional

    private Integer zoneId;     // optional
}

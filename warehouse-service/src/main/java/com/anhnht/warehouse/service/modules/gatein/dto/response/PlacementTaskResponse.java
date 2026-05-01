package com.anhnht.warehouse.service.modules.gatein.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PlacementTaskResponse {
    private Integer taskId;
    private String containerId;
    private Integer slotId;
    private String slotName; // "R1C2"
    private Integer tier;
    private String status;
    private String yardName;
    private String zoneName;
    private String blockName;
    private String cargoType;
    private String containerType;
    private Double grossWeight;
    private LocalDateTime createdAt;
}

package com.anhnht.warehouse.service.modules.dashboard.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ZoneOccupancyDto {
    private Integer zoneId;
    private String  zoneName;
    private String  yardName;
    private String  yardType;     // e.g. 'dry' | 'cold' | 'fragile' | 'hazard'
    private int     capacitySlots;
    private long    occupiedSlots;
    private double  occupancyRate;  // 0.0 – 1.0
}

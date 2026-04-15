package com.anhnht.warehouse.service.modules.report.dto.response;

import com.anhnht.warehouse.service.modules.dashboard.dto.response.ZoneOccupancyDto;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ZoneOccupancyReportResponse {

    private long                   totalCapacity;
    private long                   totalOccupied;
    private double                 overallOccupancyRate;
    private List<ZoneOccupancyDto> zones;
}

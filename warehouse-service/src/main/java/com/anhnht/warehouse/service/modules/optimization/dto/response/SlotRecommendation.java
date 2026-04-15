package com.anhnht.warehouse.service.modules.optimization.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SlotRecommendation {

    private Integer slotId;
    private Integer rowNo;
    private Integer bayNo;
    private Integer recommendedTier;   // tier to place the new container

    private String  blockName;
    private String  zoneName;
    private String  yardName;

    private double  finalScore;
    private double  mlScore;
    private double  movesNorm;
    private double  exitNorm;
    private double  futureBlockNorm;

    private int     relocationsEstimated; // containers that will need to move before this one
}

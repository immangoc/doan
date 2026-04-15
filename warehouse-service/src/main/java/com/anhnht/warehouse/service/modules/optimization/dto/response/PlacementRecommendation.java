package com.anhnht.warehouse.service.modules.optimization.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlacementRecommendation {

    private String containerId;       // null if ad-hoc (no registered container)
    private String cargoTypeName;
    private String resolvedYardType;

    /** Top-5 candidates sorted by finalScore descending. */
    private List<SlotRecommendation> recommendations;

    private int totalCandidatesEvaluated;
    private long computationTimeMs;
}

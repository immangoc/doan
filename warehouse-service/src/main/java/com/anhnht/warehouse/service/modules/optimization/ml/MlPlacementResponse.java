package com.anhnht.warehouse.service.modules.optimization.ml;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MlPlacementResponse(
        String containerId,
        String cargoTypeName,
        String resolvedYardType,
        List<MlSlotRecommendation> recommendations,
        Integer totalCandidatesEvaluated,
        Integer computationTimeMs,
        String modelName
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MlSlotRecommendation(
            String slotId,
            Double mlScore,
            Double finalScore
    ) {}
}

package com.anhnht.warehouse.service.modules.optimization.algorithm;

import com.anhnht.warehouse.service.modules.optimization.dto.response.PlacementRecommendation;
import com.anhnht.warehouse.service.modules.optimization.dto.response.SlotRecommendation;
import com.anhnht.warehouse.service.modules.yard.entity.Block;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

/**
 * Smart Stacking Algorithm — orchestrator.
 *
 * Runs the 4-module pipeline sequentially:
 *   0. PreFilterModule  — hard constraint (cargo ↔ yard type)
 *   A. ScoringModule    — heuristic ml_score
 *   B. RelocationBfsModule — relocation moves & priority_guard
 *   C. ExitDistanceModule  — exit_norm, future_block_norm, final_score
 *
 * Returns a PlacementRecommendation with the Top-5 slots.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StackingAlgorithm {

    private static final int TOP_N = 5;

    private final PreFilterModule      preFilter;
    private final ScoringModule        scoring;
    private final RelocationBfsModule  relocationBfs;
    private final ExitDistanceModule   exitDistance;

    /**
     * Run the full pipeline and return top-N recommendations.
     *
     * @param containerId    nullable — used in response metadata only
     * @param cargoTypeName  exact cargo type name from DB
     * @param grossWeight    container gross weight (nullable)
     * @return placement recommendation with top-5 slots
     */
    public PlacementRecommendation recommend(String containerId,
                                             String cargoTypeName,
                                             BigDecimal grossWeight,
                                             String containerType) {
        long start = System.currentTimeMillis();

        // Module 0 — Pre-filter
        String yardTypeName = preFilter.resolveYardType(cargoTypeName);
        List<SlotCandidate> candidates = preFilter.filter(yardTypeName, grossWeight, containerType);
        log.debug("[Algorithm] Pre-filter passed: {} candidates", candidates.size());

        // Module A — Heuristic scoring
        scoring.score(candidates);

        // Module B — BFS relocation
        relocationBfs.evaluate(candidates);

        // Module C — Exit distance + final score
        exitDistance.evaluate(candidates);

        // Collect top-N feasible candidates
        List<SlotRecommendation> topN = candidates.stream()
                .filter(SlotCandidate::isFeasible)
                .sorted(Comparator.comparingDouble(SlotCandidate::getFinalScore).reversed())
                .limit(TOP_N)
                .map(this::toRecommendation)
                .toList();

        long elapsed = System.currentTimeMillis() - start;
        log.debug("[Algorithm] Completed in {}ms — {} feasible, top-{} returned",
                elapsed, candidates.stream().filter(SlotCandidate::isFeasible).count(), topN.size());

        return PlacementRecommendation.builder()
                .containerId(containerId)
                .cargoTypeName(cargoTypeName)
                .resolvedYardType(yardTypeName)
                .recommendations(topN)
                .totalCandidatesEvaluated(candidates.size())
                .computationTimeMs(elapsed)
                .build();
    }

    // ----------------------------------------------------------------

    private SlotRecommendation toRecommendation(SlotCandidate c) {
        Slot     slot  = c.getSlot();
        Block    block = slot.getBlock();
        YardZone zone  = block.getZone();

        return SlotRecommendation.builder()
                .slotId(slot.getSlotId())
                .rowNo(slot.getRowNo())
                .bayNo(slot.getBayNo())
                .recommendedTier(c.getRecommendedTier())
                .blockName(block.getBlockName())
                .zoneName(zone.getZoneName())
                .yardName(zone.getYard().getYardName())
                .finalScore(round(c.getFinalScore()))
                .mlScore(round(c.getMlScore()))
                .movesNorm(round(c.getMovesNorm()))
                .exitNorm(round(c.getExitNorm()))
                .futureBlockNorm(round(c.getFutureBlockNorm()))
                .relocationsEstimated(c.getRelocations())
                .build();
    }

    private double round(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}

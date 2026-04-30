package com.anhnht.warehouse.service.modules.optimization.algorithm;

import com.anhnht.warehouse.service.common.util.DateTimeUtils;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.optimization.ml.MlScoringClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Module A — Slot scoring.
 *
 * Tries the Python LightGBM service first via {@link MlScoringClient}; for any
 * slot the ML service returns a score for, that score is used directly. For
 * everything else (or when the service is unavailable), falls back to the
 * heuristic ml_score = 0.40 × tier_score + 0.30 × occupancy_score + 0.30 × (1 − urgency_norm).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ScoringModule {

    private static final double W_TIER      = 0.40;
    private static final double W_OCCUPANCY = 0.30;
    private static final double W_URGENCY   = 0.30;

    private final ContainerPositionRepository positionRepository;
    private final YardStorageRepository       storageRepository;
    private final MlScoringClient             mlClient;

    public void score(List<SlotCandidate> candidates,
                      String containerId,
                      String cargoTypeName,
                      BigDecimal grossWeight,
                      String sizeType) {
        Map<Integer, Double> mlScores = mlClient
                .fetchScores(containerId, cargoTypeName, grossWeight, sizeType)
                .orElse(Map.of());
        int mlHits = 0;

        for (SlotCandidate c : candidates) {
            if (!c.isFeasible()) continue;

            Double fromMl = mlScores.get(c.getSlot().getSlotId());
            if (fromMl != null) {
                c.setMlScore(clamp(fromMl));
                mlHits++;
            } else {
                c.setMlScore(clamp(heuristic(c)));
            }
        }
        log.info("[Scoring] ml_used={} ml_hits={}/{}",
                !mlScores.isEmpty(), mlHits, candidates.size());
    }

    // ----------------------------------------------------------------

    private double heuristic(SlotCandidate c) {
        double tierScore      = computeTierScore(c);
        double occupancyScore = computeOccupancyScore(c);
        double urgencyNorm    = computeUrgencyNorm(c);

        return W_TIER      * tierScore
             + W_OCCUPANCY * occupancyScore
             + W_URGENCY   * (1.0 - urgencyNorm);
    }

    /** tier_score = (maxTier − occupiedTiers) / maxTier  → higher = more room */
    private double computeTierScore(SlotCandidate c) {
        int maxTier  = c.getSlot().getMaxTier();
        int occupied = c.getOccupiedTiers();
        return (double) (maxTier - occupied) / maxTier;
    }

    /**
     * occupancy_score = 1 − zone_occupancy_rate
     * zone_occupancy_rate = countOccupiedInZone / capacitySlots
     */
    private double computeOccupancyScore(SlotCandidate c) {
        long occupied  = positionRepository.countOccupiedInZone(c.getZoneId());
        int  capacity  = Math.max(c.getCapacitySlots(), 1);
        double rate    = Math.min((double) occupied / capacity, 1.0);
        return 1.0 - rate;
    }

    /**
     * urgency_norm = min(Σ exitUrgency(container_in_slot), 1.0)
     * exitUrgency = 1 / max(daysToExit, 1)
     */
    private double computeUrgencyNorm(SlotCandidate c) {
        var positions = positionRepository
                .findBySlotIdOrderByTierDesc(c.getSlot().getSlotId());

        double totalUrgency = 0.0;
        for (var pos : positions) {
            String cid = pos.getContainer().getContainerId();
            Optional<LocalDate> exitDate = storageRepository.findExpectedExitDate(cid);
            if (exitDate.isPresent()) {
                totalUrgency += DateTimeUtils.exitUrgency(exitDate.get());
            }
        }
        return Math.min(totalUrgency, 1.0);
    }

    private static double clamp(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }
}

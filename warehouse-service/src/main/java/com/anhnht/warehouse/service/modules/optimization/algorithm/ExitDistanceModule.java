package com.anhnht.warehouse.service.modules.optimization.algorithm;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Module C — Exit Distance Scoring.
 *
 * Penalizes slots that are far from the exit gate.
 * Assumption: row=1, bay=1 = closest to exit gate.
 *
 * exit_norm = (rowNo + bayNo) / (maxRow + maxBay)  in the same zone
 * μ_eff     = MU_HIGH if zone_occupancy ≥ OCC_CRITICAL, else MU
 *
 * Also computes future_block_norm:
 *   future_block_norm = min(occupiedTiers / MAX_FUTURE_BLOCK, 1.0)
 *   Higher current stack → more likely to cause future blocking.
 */
@Component
@RequiredArgsConstructor
public class ExitDistanceModule {

    private final ContainerPositionRepository positionRepository;

    public void evaluate(List<SlotCandidate> candidates) {
        if (candidates.isEmpty()) return;

        // Compute max rowNo and bayNo across all candidates for normalization
        int maxRow = candidates.stream()
                .filter(SlotCandidate::isFeasible)
                .mapToInt(c -> c.getSlot().getRowNo())
                .max().orElse(1);
        int maxBay = candidates.stream()
                .filter(SlotCandidate::isFeasible)
                .mapToInt(c -> c.getSlot().getBayNo())
                .max().orElse(1);
        int normDenominator = Math.max(maxRow + maxBay, 1);

        for (SlotCandidate c : candidates) {
            if (!c.isFeasible()) continue;

            Slot slot = c.getSlot();
            int zoneId = c.getZoneId();

            // exit_norm
            double exitNorm = (double) (slot.getRowNo() + slot.getBayNo()) / normDenominator;
            c.setExitNorm(Math.min(exitNorm, 1.0));

            // future_block_norm
            double futureBlockNorm = Math.min(
                    (double) c.getOccupiedTiers() / AppConstant.MAX_FUTURE_BLOCK, 1.0);
            c.setFutureBlockNorm(futureBlockNorm);

            // μ_eff based on zone occupancy
            long occupied = positionRepository.countOccupiedInZone(zoneId);
            double occupancyRate = Math.min(
                    (double) occupied / Math.max(c.getCapacitySlots(), 1), 1.0);
            double muEff = (occupancyRate >= AppConstant.OCC_CRITICAL_THRESHOLD)
                    ? AppConstant.MU_HIGH
                    : AppConstant.MU;

            // Store μ_eff in the candidate via final score computation
            double finalScore = c.getMlScore()
                    - AppConstant.LAMBDA    * c.getMovesNorm()
                    - muEff                 * c.getExitNorm()
                    - AppConstant.NU        * c.getFutureBlockNorm();

            c.setFinalScore(finalScore);
        }
    }
}

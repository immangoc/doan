package com.anhnht.warehouse.service.modules.optimization.algorithm;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.modules.container.repository.ExportPriorityRepository;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Module B — Relocation BFS.
 *
 * For each candidate slot, estimates the number of future relocation moves
 * our new container will require when it eventually needs to be exported.
 *
 * Logic:
 *   - Scan containers already in the slot (below proposed tier).
 *   - Count those whose expected exit date is SOONER than average
 *     (they will need to be moved before our container can exit).
 *   - priority_guard: if any container has priority_level ≥ 3 AND
 *     exit_deadline ≤ T_URGENT days → mark slot INFEASIBLE.
 *
 * Sets:
 *   - candidate.relocations
 *   - candidate.movesNorm = min(relocations, MAX_RELOCATION_DEPTH) / MAX_RELOCATION_DEPTH
 *   - candidate.feasible = false when priority_guard fires
 */
@Component
@RequiredArgsConstructor
public class RelocationBfsModule {

    private static final int PRIORITY_GUARD_THRESHOLD = 3;

    private final ContainerPositionRepository positionRepository;
    private final YardStorageRepository       storageRepository;
    private final ExportPriorityRepository    priorityRepository;

    public void evaluate(List<SlotCandidate> candidates) {
        for (SlotCandidate c : candidates) {
            if (!c.isFeasible()) continue;

            List<ContainerPosition> stack =
                    positionRepository.findBySlotIdOrderByTierDesc(c.getSlot().getSlotId());

            int relocations = 0;

            for (ContainerPosition pos : stack) {
                String cid = pos.getContainer().getContainerId();

                // priority_guard check
                Optional<LocalDate> exitDate = storageRepository.findExpectedExitDate(cid);
                boolean urgentExit = exitDate.isPresent() &&
                        isWithinDays(exitDate.get(), AppConstant.DEADLINE_URGENT_DAYS);

                int priority = priorityRepository
                        .findByContainerContainerId(cid)
                        .map(ep -> ep.getPriorityLevel())
                        .orElse(1);

                if (priority >= PRIORITY_GUARD_THRESHOLD && urgentExit) {
                    // Placing here would block a high-priority urgent container → INFEASIBLE
                    c.setFeasible(false);
                    break;
                }

                // Count containers that have an exit date sooner than today + WARN threshold
                // These containers will need to be moved, and our new container may be above them
                if (exitDate.isPresent() &&
                    isWithinDays(exitDate.get(), AppConstant.DEADLINE_WARN_DAYS)) {
                    relocations++;
                }
            }

            if (!c.isFeasible()) continue;

            // BFS depth limit: if too many future conflicts, mark infeasible
            if (relocations > AppConstant.MAX_RELOCATION_DEPTH) {
                c.setFeasible(false);
                continue;
            }

            c.setRelocations(relocations);
            c.setMovesNorm((double) relocations / AppConstant.MAX_RELOCATION_DEPTH);
        }
    }

    private boolean isWithinDays(LocalDate date, int days) {
        long remaining = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), date);
        return remaining >= 0 && remaining <= days;
    }
}

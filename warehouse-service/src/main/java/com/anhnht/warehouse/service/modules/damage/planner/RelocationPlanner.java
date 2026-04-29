package com.anhnht.warehouse.service.modules.damage.planner;

import com.anhnht.warehouse.service.modules.damage.dto.RelocationMove;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationPlanResponse;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Computes a relocation plan for moving a damaged container into the damaged yard.
 *
 * Strategy:
 *   1. Find every blocker container in the same slot at higher tiers (top-down).
 *   2. For each blocker pick the best free (slot, tier) that:
 *        - is not yet occupied (virtually — accounting for previous moves in plan),
 *        - satisfies gravity: tier == 1, OR (slot, tier-1) is occupied (or being placed there).
 *      Preference order:
 *        a. tier 1 in same zone as the blocker
 *        b. higher tier (with support) in same zone
 *        c. tier 1 in another zone
 *        d. higher tier (with support) anywhere
 *      Tie-break by Manhattan distance from the blocker's current slot.
 *   3. Append the target → first free tier-1 slot in the damaged yard as the final move.
 *
 * The planner is pure (no DB writes); execution is done by DamageReportService.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RelocationPlanner {

    private final ContainerPositionRepository positionRepository;
    private final SlotRepository              slotRepository;

    public RelocationPlanResponse plan(String containerId) {
        ContainerPosition target = positionRepository
                .findByContainerContainerId(containerId)
                .orElse(null);
        if (target == null) {
            return infeasible(containerId, 0, "Container chưa có vị trí trong kho");
        }

        List<ContainerPosition> blockers = positionRepository
                .findBySlotIdOrderByTierDesc(target.getSlot().getSlotId()).stream()
                .filter(p -> p.getTier() > target.getTier())
                .toList();

        // Snapshot current occupancy (slotId, tier) for the entire yard system. This is
        // mutated as we add/remove positions virtually while building the plan.
        Set<String> occupied = new HashSet<>();
        positionRepository.findAll().forEach(p ->
                occupied.add(key(p.getSlot().getSlotId(), p.getTier())));

        Integer targetYardId = target.getSlot().getBlock().getZone().getYard().getYardId();

        // Pre-compute candidate slots per yard (yardId -> slots).
        List<Slot> sameYardSlots = slotRepository.findAll().stream()
                .filter(s -> Objects.equals(s.getBlock().getZone().getYard().getYardId(), targetYardId))
                .filter(s -> !Objects.equals(s.getSlotId(), target.getSlot().getSlotId()))
                .filter(s -> Boolean.FALSE.equals(s.getIsLocked()) || s.getIsLocked() == null)
                .toList();

        List<RelocationMove> moves = new ArrayList<>();

        for (ContainerPosition blocker : blockers) {
            // Free up blocker's current cell virtually so its tier-1 dependents stay supported
            // by the *bottom* of the stack (tier-1 of source slot is still occupied).
            String sourceKey = key(blocker.getSlot().getSlotId(), blocker.getTier());
            occupied.remove(sourceKey);

            SlotTier dest = findBestSlotAndTier(blocker, sameYardSlots, occupied);
            if (dest == null) {
                return infeasible(containerId, blockers.size(),
                        "Không tìm được slot trống cho container chặn " + blocker.getContainer().getContainerId());
            }
            occupied.add(key(dest.slot.getSlotId(), dest.tier));
            moves.add(buildMove(blocker, dest.slot, dest.tier, "BLOCKER_OF_DAMAGED"));
        }

        // Free up target cell, then place target into damaged yard tier 1.
        occupied.remove(key(target.getSlot().getSlotId(), target.getTier()));
        Slot damagedSlot = findFreeDamagedSlot(occupied);
        if (damagedSlot == null) {
            return infeasible(containerId, blockers.size(), "Kho hỏng đã đầy ở tier 1");
        }
        occupied.add(key(damagedSlot.getSlotId(), 1));
        moves.add(buildMove(target, damagedSlot, 1, "DAMAGE_RELOCATION"));

        return RelocationPlanResponse.builder()
                .targetContainerId(containerId)
                .feasible(true)
                .moves(moves)
                .blockerCount(blockers.size())
                .build();
    }

    // ──────────────────────────────────────────────────────────── slot search

    private record SlotTier(Slot slot, int tier) {}

    private SlotTier findBestSlotAndTier(ContainerPosition blocker,
                                         List<Slot> candidates,
                                         Set<String> occupied) {
        YardZone fromZone = blocker.getSlot().getBlock().getZone();

        SlotTier best = null;
        int bestRank = Integer.MAX_VALUE;
        int bestDist = Integer.MAX_VALUE;

        for (Slot s : candidates) {
            int maxTier = s.getMaxTier() != null ? s.getMaxTier() : 1;
            boolean sameZone = Objects.equals(s.getBlock().getZone().getZoneId(), fromZone.getZoneId());

            for (int tier = 1; tier <= maxTier; tier++) {
                if (occupied.contains(key(s.getSlotId(), tier))) continue;
                // Gravity invariant
                if (tier > 1 && !occupied.contains(key(s.getSlotId(), tier - 1))) continue;

                // Preference rank: prefer same zone (0) over different zone (2);
                // within zone tier, prefer tier 1 (+0) over tier 2+ (+1).
                int rank = (sameZone ? 0 : 2) + (tier == 1 ? 0 : 1);
                int dist = manhattan(s, blocker.getSlot());

                if (rank < bestRank || (rank == bestRank && dist < bestDist)) {
                    bestRank = rank;
                    bestDist = dist;
                    best = new SlotTier(s, tier);
                }
            }
        }
        return best;
    }

    private Slot findFreeDamagedSlot(Set<String> occupied) {
        return slotRepository.findByYardTypeName("damaged").stream()
                .filter(s -> !occupied.contains(key(s.getSlotId(), 1)))
                .min(Comparator.comparingInt(Slot::getRowNo).thenComparingInt(Slot::getBayNo))
                .orElse(null);
    }

    // ──────────────────────────────────────────────────────────── helpers

    private int manhattan(Slot a, Slot b) {
        return Math.abs(a.getRowNo() - b.getRowNo()) + Math.abs(a.getBayNo() - b.getBayNo());
    }

    private static String key(Integer slotId, Integer tier) { return slotId + "/" + tier; }

    private RelocationMove buildMove(ContainerPosition src, Slot dest, int destTier, String purpose) {
        Slot     fromSlot = src.getSlot();
        YardZone fromZone = fromSlot.getBlock().getZone();
        YardZone toZone   = dest.getBlock().getZone();
        return RelocationMove.builder()
                .containerId(src.getContainer().getContainerId())
                .fromSlotId(fromSlot.getSlotId())
                .fromZone(fromZone.getZoneName())
                .fromRow(fromSlot.getRowNo())
                .fromBay(fromSlot.getBayNo())
                .fromTier(src.getTier())
                .toSlotId(dest.getSlotId())
                .toZone(toZone.getZoneName())
                .toRow(dest.getRowNo())
                .toBay(dest.getBayNo())
                .toTier(destTier)
                .purpose(purpose)
                .build();
    }

    private RelocationPlanResponse infeasible(String containerId, int blockerCount, String reason) {
        return RelocationPlanResponse.builder()
                .targetContainerId(containerId)
                .feasible(false)
                .infeasibilityReason(reason)
                .moves(List.of())
                .blockerCount(blockerCount)
                .build();
    }
}

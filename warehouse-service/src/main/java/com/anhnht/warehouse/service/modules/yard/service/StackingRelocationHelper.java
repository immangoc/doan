package com.anhnht.warehouse.service.modules.yard.service;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationMove;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.yard.dto.request.RelocationRequest;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Shared helper to handle stacking constraints:
 *   When a container is removed from a slot (gate-out, damage move, damage return),
 *   any containers stacked above it MUST be relocated first so they don't float.
 *
 * <p>This component computes a relocation plan for blockers AND executes it.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StackingRelocationHelper {

    private final ContainerPositionRepository positionRepository;
    private final SlotRepository              slotRepository;
    private final RelocationService           relocationService;

    /**
     * Detects containers stacked above the target in the same slot,
     * relocates them (top-down) to the nearest available slot/tier,
     * and returns a list of moves performed so the caller can report them.
     *
     * @param containerId the container to be removed/exported
     * @param purpose     a label for the move reason (e.g. "BLOCKER_OF_GATE_OUT")
     * @return list of relocation moves performed (empty if no blockers)
     */
    public List<RelocationMove> resolveBlockers(String containerId, String purpose) {
        ContainerPosition target = positionRepository.findByContainerContainerId(containerId)
                .orElse(null);
        if (target == null) return Collections.emptyList();

        // Get all containers in the same slot, ordered top-down
        List<ContainerPosition> blockers = positionRepository
                .findBySlotIdOrderByTierDesc(target.getSlot().getSlotId()).stream()
                .filter(p -> p.getTier() > target.getTier())
                .toList();

        if (blockers.isEmpty()) return Collections.emptyList();

        // Build virtual occupancy map for planning
        Set<String> occupied = new HashSet<>();
        positionRepository.findAll().forEach(p ->
                occupied.add(key(p.getSlot().getSlotId(), p.getTier())));

        Integer targetYardId = target.getSlot().getBlock().getZone().getYard().getYardId();

        // Candidate slots: same yard, different from target slot, not locked
        List<Slot> sameYardSlots = slotRepository.findAll().stream()
                .filter(s -> Objects.equals(s.getBlock().getZone().getYard().getYardId(), targetYardId))
                .filter(s -> !Objects.equals(s.getSlotId(), target.getSlot().getSlotId()))
                .filter(s -> Boolean.FALSE.equals(s.getIsLocked()) || s.getIsLocked() == null)
                .toList();

        // Also consider slots from other yards as fallback
        List<Slot> allSlots = slotRepository.findAll().stream()
                .filter(s -> !Objects.equals(s.getSlotId(), target.getSlot().getSlotId()))
                .filter(s -> Boolean.FALSE.equals(s.getIsLocked()) || s.getIsLocked() == null)
                .toList();

        List<RelocationMove> moves = new ArrayList<>();

        // Process top-down: move highest tier first
        for (ContainerPosition blocker : blockers) {
            String sourceKey = key(blocker.getSlot().getSlotId(), blocker.getTier());
            occupied.remove(sourceKey);

            // Try same yard first, then all yards
            SlotTier dest = findBestSlotAndTier(blocker, sameYardSlots, occupied);
            if (dest == null) {
                dest = findBestSlotAndTier(blocker, allSlots, occupied);
            }
            if (dest == null) {
                throw new BusinessException(ErrorCode.SLOT_INFEASIBLE,
                        "Không tìm được vị trí để đảo chuyển container chặn "
                                + blocker.getContainer().getContainerId()
                                + " (đang ở tier " + blocker.getTier() + ")");
            }

            occupied.add(key(dest.slot.getSlotId(), dest.tier));

            // Execute the physical relocation
            RelocationRequest req = new RelocationRequest();
            req.setContainerId(blocker.getContainer().getContainerId());
            req.setTargetSlotId(dest.slot.getSlotId());
            req.setTargetTier(dest.tier);
            relocationService.relocate(req);

            // Build the move record
            RelocationMove move = buildMove(blocker, dest.slot, dest.tier, purpose);
            moves.add(move);

            log.info("[StackingRelocator] Moved blocker {} from slot {} tier {} → slot {} tier {} (reason: {})",
                    blocker.getContainer().getContainerId(),
                    blocker.getSlot().getSlotId(), blocker.getTier(),
                    dest.slot.getSlotId(), dest.tier, purpose);
        }

        return moves;
    }

    // ──────────────────────────────────────────────────── slot search

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
                // Gravity invariant: tier > 1 requires tier-1 to be occupied
                if (tier > 1 && !occupied.contains(key(s.getSlotId(), tier - 1))) continue;

                // Preference: same zone (0) vs different zone (2); tier 1 (+0) vs tier 2+ (+1)
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

    // ──────────────────────────────────────────────────── helpers

    private int manhattan(Slot a, Slot b) {
        return Math.abs(a.getRowNo() - b.getRowNo()) + Math.abs(a.getBayNo() - b.getBayNo());
    }

    private static String key(Integer slotId, Integer tier) {
        return slotId + "/" + tier;
    }

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
}

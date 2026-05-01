package com.anhnht.warehouse.service.modules.yard.service;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationMove;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.optimization.algorithm.StackingAlgorithm;
import com.anhnht.warehouse.service.modules.optimization.dto.response.PlacementRecommendation;
import com.anhnht.warehouse.service.modules.optimization.dto.response.SlotRecommendation;
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
 * <p>This component uses the ML-based StackingAlgorithm to find optimal relocation
 * positions that respect all placement rules:</p>
 * <ul>
 *   <li>Cargo type → yard type mapping (Hàng Lạnh → cold, Hàng Khô → dry, etc.)</li>
 *   <li>Container size constraints (20ft vs 40ft zones, bay ≥ 5 for 40ft)</li>
 *   <li>Weight limits per stack</li>
 *   <li>ML scoring for optimal placement</li>
 * </ul>
 *
 * <p>Falls back to a simple nearest-slot search if the ML algorithm fails
 * (e.g. if no slots pass pre-filter for the blocker's cargo type).</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StackingRelocationHelper {

    private final ContainerPositionRepository positionRepository;
    private final SlotRepository              slotRepository;
    private final RelocationService           relocationService;
    private final StackingAlgorithm           stackingAlgorithm;

    /**
     * Detects containers stacked above the target in the same slot,
     * relocates them (top-down) using the ML algorithm to find rule-compliant positions,
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

        // Build virtual occupancy map for fallback planning
        Set<String> occupied = new HashSet<>();
        positionRepository.findAll().forEach(p ->
                occupied.add(key(p.getSlot().getSlotId(), p.getTier())));

        List<RelocationMove> moves = new ArrayList<>();

        // Process top-down: move highest tier first
        for (ContainerPosition blocker : blockers) {
            String sourceKey = key(blocker.getSlot().getSlotId(), blocker.getTier());
            occupied.remove(sourceKey);

            Container blockerContainer = blocker.getContainer();

            // ═══════════════════════════════════════════════════════════════
            // ★ Use ML Algorithm to find the best position respecting rules
            // ═══════════════════════════════════════════════════════════════
            SlotTier dest = findDestinationViaML(blockerContainer, blocker, occupied);

            // Fallback to simple nearest-slot search if ML fails
            if (dest == null) {
                log.warn("[StackingRelocator] ML algorithm failed for blocker {}, falling back to simple search",
                        blockerContainer.getContainerId());
                dest = findBestSlotAndTierFallback(blocker, occupied);
            }

            if (dest == null) {
                throw new BusinessException(ErrorCode.SLOT_INFEASIBLE,
                        "Không tìm được vị trí phù hợp để đảo chuyển container chặn "
                                + blockerContainer.getContainerId()
                                + " (đang ở tier " + blocker.getTier() + ")");
            }

            occupied.add(key(dest.slot.getSlotId(), dest.tier));

            // Execute the physical relocation
            RelocationRequest req = new RelocationRequest();
            req.setContainerId(blockerContainer.getContainerId());
            req.setTargetSlotId(dest.slot.getSlotId());
            req.setTargetTier(dest.tier);
            relocationService.relocate(req);

            // Build the move record
            RelocationMove move = buildMove(blocker, dest.slot, dest.tier, purpose);
            moves.add(move);

            log.info("[StackingRelocator] Moved blocker {} from {} R{}B{}/T{} → {} R{}B{}/T{} (reason: {}, method: {})",
                    blockerContainer.getContainerId(),
                    blocker.getSlot().getBlock().getZone().getZoneName(),
                    blocker.getSlot().getRowNo(), blocker.getSlot().getBayNo(), blocker.getTier(),
                    dest.slot.getBlock().getZone().getZoneName(),
                    dest.slot.getRowNo(), dest.slot.getBayNo(), dest.tier,
                    purpose, dest.method);
        }

        return moves;
    }

    // ──────────────────────────────────────────────────── ML-based search

    /**
     * Uses the full StackingAlgorithm (PreFilter + ML Scoring + BFS + ExitDistance)
     * to find the best relocation slot that obeys all placement rules:
     *   - cargo type → yard type
     *   - 20ft/40ft size constraints
     *   - weight limits
     *   - ML optimization scoring
     */
    private SlotTier findDestinationViaML(Container container, ContainerPosition blocker,
                                           Set<String> occupied) {
        try {
            String cargoTypeName = container.getCargoType() != null
                    ? container.getCargoType().getCargoTypeName() : null;
            if (cargoTypeName == null) return null;

            String sizeType = container.getContainerType() != null
                    ? (container.getContainerType().getContainerTypeName().toUpperCase().contains("40")
                        ? "40ft" : "20ft")
                    : "20ft";

            PlacementRecommendation recommendation = stackingAlgorithm.recommend(
                    container.getContainerId(),
                    cargoTypeName,
                    container.getGrossWeight(),
                    sizeType
            );

            if (recommendation.getRecommendations() == null
                    || recommendation.getRecommendations().isEmpty()) {
                return null;
            }

            // Try each recommended slot (top-1 first) until we find one that's not occupied
            for (SlotRecommendation rec : recommendation.getRecommendations()) {
                if (rec.getSlotId() == null) continue;

                // Skip the slot we're removing from
                if (Objects.equals(rec.getSlotId(), blocker.getSlot().getSlotId())) continue;

                int tier = rec.getRecommendedTier() != null ? rec.getRecommendedTier() : 1;

                // Check virtual occupancy (accounts for previous relocations in this batch)
                if (occupied.contains(key(rec.getSlotId(), tier))) continue;

                // Gravity check: tier > 1 requires tier-1 to be occupied
                if (tier > 1 && !occupied.contains(key(rec.getSlotId(), tier - 1))) continue;

                Slot slot = slotRepository.findById(rec.getSlotId()).orElse(null);
                if (slot == null) continue;

                log.info("[StackingRelocator] ML recommended slot {} R{}B{}/T{} (score: {}) for blocker {}",
                        rec.getSlotId(), rec.getRowNo(), rec.getBayNo(), tier,
                        rec.getFinalScore(), container.getContainerId());

                return new SlotTier(slot, tier, "ML");
            }

            return null;
        } catch (Exception e) {
            log.warn("[StackingRelocator] ML recommendation failed for {}: {}",
                    container.getContainerId(), e.getMessage());
            return null;
        }
    }

    // ──────────────────────────────────────────────────── fallback search

    private record SlotTier(Slot slot, int tier, String method) {}

    /**
     * Fallback: simple nearest-slot search (same yard first, then all yards).
     * Only used when the ML algorithm cannot find a suitable position.
     */
    private SlotTier findBestSlotAndTierFallback(ContainerPosition blocker, Set<String> occupied) {
        Integer targetYardId = blocker.getSlot().getBlock().getZone().getYard().getYardId();
        String  yardTypeName = blocker.getSlot().getBlock().getZone().getYard().getYardType() != null
                ? blocker.getSlot().getBlock().getZone().getYard().getYardType().getYardTypeName()
                : null;

        // Same yard type slots first (respect cargo type → yard type rule)
        List<Slot> sameTypeSlots = yardTypeName != null
                ? slotRepository.findAll().stream()
                    .filter(s -> !Objects.equals(s.getSlotId(), blocker.getSlot().getSlotId()))
                    .filter(s -> Boolean.FALSE.equals(s.getIsLocked()) || s.getIsLocked() == null)
                    .filter(s -> {
                        var yt = s.getBlock().getZone().getYard().getYardType();
                        return yt != null && Objects.equals(yt.getYardTypeName(), yardTypeName);
                    })
                    .toList()
                : Collections.emptyList();

        SlotTier result = searchSlots(blocker, sameTypeSlots, occupied);
        if (result != null) return result;

        // Fallback: same yard
        List<Slot> sameYardSlots = slotRepository.findAll().stream()
                .filter(s -> Objects.equals(s.getBlock().getZone().getYard().getYardId(), targetYardId))
                .filter(s -> !Objects.equals(s.getSlotId(), blocker.getSlot().getSlotId()))
                .filter(s -> Boolean.FALSE.equals(s.getIsLocked()) || s.getIsLocked() == null)
                .toList();

        result = searchSlots(blocker, sameYardSlots, occupied);
        if (result != null) return result;

        // Last resort: any yard
        List<Slot> allSlots = slotRepository.findAll().stream()
                .filter(s -> !Objects.equals(s.getSlotId(), blocker.getSlot().getSlotId()))
                .filter(s -> Boolean.FALSE.equals(s.getIsLocked()) || s.getIsLocked() == null)
                .toList();

        return searchSlots(blocker, allSlots, occupied);
    }

    private SlotTier searchSlots(ContainerPosition blocker, List<Slot> candidates, Set<String> occupied) {
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

                int rank = (sameZone ? 0 : 2) + (tier == 1 ? 0 : 1);
                int dist = manhattan(s, blocker.getSlot());

                if (rank < bestRank || (rank == bestRank && dist < bestDist)) {
                    bestRank = rank;
                    bestDist = dist;
                    best = new SlotTier(s, tier, "FALLBACK");
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

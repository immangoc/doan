package com.anhnht.warehouse.service.modules.optimization.algorithm;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Module 0 — Pre-filter (Hard Constraint).
 *
 * Enforces cargo-type → yard-type mapping.
 * Removes any slot that:
 *   - Belongs to the wrong yard type
 *   - Is already full (occupiedTiers == maxTier)
 *   - Would exceed MAX_STACK_WEIGHT_TONS
 */
@Component
@RequiredArgsConstructor
public class PreFilterModule {

    /**
     * Hard-coded cargo type name → yard type name mapping.
     * Keys are lowercase for case-insensitive matching.
     */
    private static final Map<String, String> CARGO_TO_YARD = Map.ofEntries(
            Map.entry("hàng khô",       "dry"),
            Map.entry("hàng lạnh",      "cold"),
            Map.entry("hàng dễ vỡ",     "fragile"),
            // V38 renamed "Hàng Nguy Hiểm" → "Hàng Khác". Keep both keys
            // so old data still resolves; the hazard yard itself was
            // removed in V13 so we route to the "other" yard.
            Map.entry("hàng khác",      "other"),
            Map.entry("khác",           "other"),
            Map.entry("hàng nguy hiểm", "other"),
            // "Hàng hỏng" goes to the damaged yard. Container damage flow
            // bypasses the placement algorithm, but if a request still
            // arrives here we honor the mapping rather than 400.
            Map.entry("hàng hỏng",      "damaged")
    );

    private final SlotRepository slotRepository;

    /**
     * Returns the required yard type for the given cargo type name.
     * Throws CARGO_ZONE_MISMATCH if cargo type is unknown.
     */
    public String resolveYardType(String cargoTypeName) {
        if (cargoTypeName == null) {
            throw new BusinessException(ErrorCode.CARGO_ZONE_MISMATCH,
                    "Cargo type is required for yard mapping");
        }
        String yardType = CARGO_TO_YARD.get(cargoTypeName.toLowerCase().trim());
        if (yardType == null) {
            throw new BusinessException(ErrorCode.CARGO_ZONE_MISMATCH,
                    "Unknown cargo type for yard mapping: " + cargoTypeName);
        }
        return yardType;
    }

    /**
     * Runs the pre-filter and returns feasible SlotCandidate list.
     *
     * @param yardTypeName  required yard type (resolved from cargo type)
     * @param newGrossWeight gross weight of the new container (for weight check)
     * @return list of candidate slots passing all hard constraints
     */
    public List<SlotCandidate> filter(String yardTypeName, BigDecimal newGrossWeight) {
        List<Slot> slots = slotRepository.findByYardTypeName(yardTypeName);

        if (slots.isEmpty()) {
            throw new BusinessException(ErrorCode.YARD_FULL,
                    "No slots found in yard type: " + yardTypeName);
        }

        List<SlotCandidate> candidates = new ArrayList<>();

        for (Slot slot : slots) {
            int occupied = slotRepository.countOccupiedTiers(slot.getSlotId());

            // Hard constraint 1: slot must have room
            if (occupied >= slot.getMaxTier()) continue;

            // Hard constraint 2: weight — total stack weight must not exceed MAX
            // newGrossWeight is in kg; MAX_STACK_WEIGHT_TONS is in tonnes → convert before comparing
            if (newGrossWeight != null &&
                newGrossWeight.doubleValue() / 1000.0 > AppConstant.MAX_STACK_WEIGHT_TONS) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Trọng lượng container (" + newGrossWeight + " kg) vượt quá giới hạn "
                                + (long) AppConstant.MAX_STACK_WEIGHT_TONS + " tấn.");
            }

            int zoneId       = slot.getBlock().getZone().getZoneId();
            int capacitySlots = slot.getBlock().getZone().getCapacitySlots();

            candidates.add(new SlotCandidate(slot, occupied, zoneId, capacitySlots));
        }

        if (candidates.isEmpty()) {
            throw new BusinessException(ErrorCode.YARD_FULL,
                    "All slots in yard type '" + yardTypeName + "' are full");
        }

        return candidates;
    }
}

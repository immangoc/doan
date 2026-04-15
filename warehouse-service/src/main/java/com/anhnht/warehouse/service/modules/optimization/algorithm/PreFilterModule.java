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
    private static final Map<String, String> CARGO_TO_YARD = Map.of(
            "hàng khô",       "dry",
            "hàng lạnh",      "cold",
            "hàng dễ vỡ",     "fragile",
            "hàng nguy hiểm", "hazard"
    );

    private final SlotRepository slotRepository;

    /**
     * Returns the required yard type for the given cargo type name.
     * Throws CARGO_ZONE_MISMATCH if cargo type is unknown.
     */
    public String resolveYardType(String cargoTypeName) {
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
    public List<SlotCandidate> filter(String yardTypeName, BigDecimal newGrossWeight, String containerType) {
        List<Slot> slots = slotRepository.findByYardTypeName(yardTypeName);

        if (slots.isEmpty()) {
            throw new BusinessException(ErrorCode.YARD_FULL,
                    "No slots found in yard type: " + yardTypeName);
        }

        List<SlotCandidate> candidates = new ArrayList<>();

        final boolean is40ft = containerType != null && containerType.toUpperCase().contains("40");

        for (Slot slot : slots) {
            if (Boolean.TRUE.equals(slot.getLocked())) continue;

            // 40ft area rule (Model A — row-pair):
            // - only allow the dedicated 40ft half (bayNo >= 5, 1-based)
            // - only consider anchor rows (odd rowNo, 1-based) that have a paired row (rowNo+1) at same bay.
            if (is40ft) {
                int bayNo = slot.getBayNo();
                if (bayNo <= 4) continue;
                int rowNo = slot.getRowNo();
                if (rowNo % 2 == 0) continue; // anchor row only
                Slot paired = slotRepository.findByBlockBlockIdAndRowNoAndBayNo(
                        slot.getBlock().getBlockId(), rowNo + 1, bayNo
                ).orElse(null);
                if (paired == null) continue;
                if (Boolean.TRUE.equals(paired.getLocked())) continue;
            }

            int occupied = slotRepository.countOccupiedTiers(slot.getSlotId());

            // Hard constraint 1: slot must have room
            if (occupied >= slot.getMaxTier()) continue;

            // Hard constraint 2: weight — total stack weight must not exceed MAX
            // newGrossWeight is in kg; MAX_STACK_WEIGHT_TONS is in tonnes → convert before comparing
            if (newGrossWeight != null &&
                newGrossWeight.doubleValue() / 1000.0 > AppConstant.MAX_STACK_WEIGHT_TONS) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Container gross weight exceeds maximum stack weight: " + newGrossWeight);
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

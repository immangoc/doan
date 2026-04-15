package com.anhnht.warehouse.service.modules.optimization.algorithm;

import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import lombok.Getter;
import lombok.Setter;

/**
 * Internal domain object representing a candidate slot during algorithm evaluation.
 * Not a JPA entity — lives only within the algorithm pipeline.
 */
@Getter
@Setter
public class SlotCandidate {

    private final Slot slot;
    private final int  occupiedTiers;       // current number of containers in this slot
    private final int  zoneId;
    private final int  capacitySlots;       // zone.capacitySlots (for occupancy calc)

    private boolean feasible = true;        // flipped to false by priority_guard or weight check

    // Scores computed by each module
    private double mlScore       = 0.0;    // Module A
    private int    relocations   = 0;      // Module B: estimated future moves
    private double movesNorm     = 0.0;    // normalized relocations
    private double exitNorm      = 0.0;    // Module C: normalized exit distance
    private double futureBlockNorm = 0.0;  // future blocking penalty
    private double finalScore    = 0.0;    // final combined score

    public SlotCandidate(Slot slot, int occupiedTiers, int zoneId, int capacitySlots) {
        this.slot          = slot;
        this.occupiedTiers = occupiedTiers;
        this.zoneId        = zoneId;
        this.capacitySlots = capacitySlots;
    }

    /** The tier at which the new container will be placed. */
    public int getRecommendedTier() {
        return occupiedTiers + 1;
    }
}

package com.anhnht.warehouse.service.modules.yard.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Generates rows × bays slots for a block in one request.
 * Slot IDs: row 1..rows, bay 1..bays, maxTier applied uniformly.
 */
@Getter
@Setter
public class SlotBatchRequest {

    @NotNull @Min(1) private Integer rows;
    @NotNull @Min(1) private Integer bays;

    @Min(1)
    private Integer maxTier = 5;
}

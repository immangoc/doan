package com.anhnht.warehouse.service.modules.damage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "RelocationMove", description = "Một bước di chuyển container.")
public class RelocationMove {

    @Schema(example = "HTHU0000123")
    private String containerId;

    @Schema(example = "1042")  private Integer fromSlotId;
    @Schema(example = "Zone A") private String  fromZone;
    @Schema(example = "2")     private Integer fromRow;
    @Schema(example = "5")     private Integer fromBay;
    @Schema(example = "3")     private Integer fromTier;

    @Schema(example = "1077")  private Integer toSlotId;
    @Schema(example = "Zone B") private String  toZone;
    @Schema(example = "1")     private Integer toRow;
    @Schema(example = "1")     private Integer toBay;
    @Schema(example = "1")     private Integer toTier;

    @Schema(description = "Lý do move.", example = "BLOCKER_OF_DAMAGED")
    private String purpose;
}

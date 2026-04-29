package com.anhnht.warehouse.service.modules.optimization.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(name = "SlotRecommendation", description = "Một slot ứng viên kèm các score thành phần.")
public class SlotRecommendation {

    @Schema(description = "DB slot id.", example = "1042")
    private Integer slotId;

    @Schema(description = "ID slot từ ML service (nếu có), thường dạng chuỗi.", example = "S00042")
    private String externalSlotId;

    @Schema(example = "2") private Integer rowNo;
    @Schema(example = "5") private Integer bayNo;
    @Schema(description = "Tier (tầng) đề xuất đặt container.", example = "2") private Integer recommendedTier;

    @Schema(example = "A1-BLK1") private String blockName;
    @Schema(example = "Zone A")  private String zoneName;
    @Schema(example = "Kho hàng khô") private String yardName;

    @Schema(description = "Final score sau khi tổng hợp ml/move/exit. Cao = tốt hơn.", example = "0.8742")
    private Double finalScore;

    @Schema(description = "ML score (0..1). Lấy từ Python LightGBM service hoặc heuristic fallback.", example = "0.83")
    private Double mlScore;

    @Schema(description = "Số lần đảo ước lượng (đã chuẩn hoá 0..1; thấp = ít đảo).", example = "0.05")
    private Double movesNorm;

    @Schema(description = "Khoảng cách tới cổng xuất (chuẩn hoá 0..1; thấp = gần cổng).", example = "0.32")
    private Double exitNorm;

    @Schema(description = "Penalty cho việc chiếm slot tương lai có thể cần.", example = "0.18")
    private Double futureBlockNorm;

    @Schema(description = "Số container ước tính cần đảo để đặt vào slot này.", example = "1")
    private Integer relocationsEstimated;
}

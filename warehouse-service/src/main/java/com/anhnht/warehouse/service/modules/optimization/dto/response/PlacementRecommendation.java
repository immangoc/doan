package com.anhnht.warehouse.service.modules.optimization.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(name = "PlacementRecommendation", description = "Kết quả gợi ý Top-5 vị trí lưu container.")
public class PlacementRecommendation {

    @Schema(description = "Container ID nếu request truyền vào; null nếu ad-hoc.", example = "HTHU0000001")
    private String containerId;

    @Schema(description = "Tên loại hàng đã sử dụng cho pipeline.", example = "Hàng Khô")
    private String cargoTypeName;

    @Schema(description = "Loại yard sau khi resolve cargo→yard (dry/cold/fragile/other).", example = "dry")
    private String resolvedYardType;

    @Schema(description = "Top-5 slot, sắp theo finalScore giảm dần.")
    private List<SlotRecommendation> recommendations;

    @Schema(description = "Tổng số candidate đi qua PreFilter.", example = "96")
    private int totalCandidatesEvaluated;

    @Schema(description = "Tổng thời gian chạy pipeline (ms).", example = "47")
    private long computationTimeMs;
}

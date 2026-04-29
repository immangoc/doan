package com.anhnht.warehouse.service.modules.optimization.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.optimization.dto.request.PlacementRequest;
import com.anhnht.warehouse.service.modules.optimization.dto.response.PlacementRecommendation;
import com.anhnht.warehouse.service.modules.optimization.service.OptimizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(
    name = "ML Optimization",
    description = "Gợi ý vị trí lưu container theo thuật toán Smart Stacking (PreFilter → ML Scoring → BFS Relocation → Exit Distance). "
                + "ML Scoring gọi sang Python service (LightGBM Ranker); fallback heuristic 0.4·tier + 0.3·occupancy + 0.3·(1-urgency) khi service không sẵn sàng."
)
@RestController
@RequestMapping("/admin/optimization")
@RequiredArgsConstructor
public class OptimizationController {

    private final OptimizationService optimizationService;

    @Operation(
        summary = "Gợi ý Top-5 vị trí lưu container",
        description = """
            Chạy pipeline 4 bước trên toàn bộ slot khả dụng:
            1. **PreFilter** — chỉ giữ slot trong yard phù hợp với cargo type và max weight.
            2. **ML Scoring** — gọi Python service `POST /recommend-placement` lấy ml_score từ LightGBM. Slot không có ml_score sẽ rơi xuống công thức heuristic.
            3. **BFS Relocation** — ước lượng số lần đảo container (moves_norm).
            4. **Exit Distance** — chuẩn hoá khoảng cách tới cổng xuất + future block penalty → final_score.

            Hỗ trợ 2 cách gọi:
            - **Theo containerId** (đã đăng ký): cargo_type, gross_weight, size_type tự lấy từ DB.
            - **Ad-hoc**: tự truyền cargoTypeName + grossWeight + sizeType.
            """
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "Trả về Top-5 slot tốt nhất, sắp xếp theo finalScore giảm dần."
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "400",
            description = "Thiếu cargoTypeName hoặc containerId; hoặc container không có cargo_type."
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "401",
            description = "Thiếu hoặc sai JWT."
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "403",
            description = "Token không có quyền ADMIN hoặc OPERATOR."
        )
    })
    @PostMapping("/recommend")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PlacementRecommendation>> recommend(
            @Valid @RequestBody PlacementRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                optimizationService.recommend(request)));
    }
}

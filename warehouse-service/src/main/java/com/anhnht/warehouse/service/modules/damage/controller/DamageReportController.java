package com.anhnht.warehouse.service.modules.damage.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.damage.dto.DamageReportRequest;
import com.anhnht.warehouse.service.modules.damage.dto.DamageReportResponse;
import com.anhnht.warehouse.service.modules.damage.dto.MoveToDamagedYardRequest;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationPlanResponse;
import com.anhnht.warehouse.service.modules.optimization.dto.response.SlotRecommendation;
import com.anhnht.warehouse.service.modules.damage.repository.DamageReportRepository;
import com.anhnht.warehouse.service.modules.damage.service.DamageReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(
    name = "Damage Workflow",
    description = "Quy trình báo hỏng container 2 pha: Pha 1 đánh dấu (không di chuyển) → "
                + "Pha 2 xác nhận chuyển vào kho hỏng kèm BFS đảo container chặn."
)
@RestController
@RequestMapping("/admin/damage")
@RequiredArgsConstructor
public class DamageReportController {

    private final DamageReportService damageService;
    private final DamageReportRepository damageReportRepository;

    @Operation(summary = "Thống kê tài chính tổng hợp hàng hỏng",
               description = "Trả về tổng tiền hoàn, tiền sửa, số container hỏng, số đã hoàn tiền.")
    @GetMapping("/financial-summary")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> financialSummary() {
        Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("totalDamageReports",   damageReportRepository.countAllActive());
        summary.put("totalCompensationCost", damageReportRepository.sumCompensationCostAll());
        summary.put("totalRepairCost",       damageReportRepository.sumRepairCostAll());
        summary.put("totalRefunded",         damageReportRepository.countRefunded());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @Operation(summary = "Pha 1 — báo hỏng (chỉ đánh dấu)",
               description = "Tạo damage_report (status=PENDING). Container đổi sang DAMAGED_PENDING, chưa di chuyển vật lý.")
    @PostMapping("/report")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<DamageReportResponse>> report(
            @Valid @RequestBody DamageReportRequest request) {
        return ResponseEntity.ok(ApiResponse.success(damageService.report(request)));
    }

    @Operation(summary = "Danh sách container đang chờ chuyển kho hỏng",
               description = "Trả về damage_report ở status PENDING/RELOCATING.")
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<List<DamageReportResponse>>> listPending() {
        return ResponseEntity.ok(ApiResponse.success(damageService.listPending()));
    }

    @Operation(summary = "Danh sách tất cả container đã được báo hỏng",
               description = "Trả về mọi damage_report (PENDING/RELOCATING/STORED), không bao gồm CANCELLED. "
                           + "Dùng cho trang Quản lý kho hỏng — hiển thị cùng 1 list các trạng thái.")
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<List<DamageReportResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.success(damageService.listAll()));
    }

    @Operation(summary = "Lịch sử báo hỏng",
               description = "Trả về mọi damage_report trừ CANCELLED, bao gồm cả RETURNED. Dùng cho Báo cáo thống kê.")
    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<DamageReportResponse>>> listHistory() {
        return ResponseEntity.ok(ApiResponse.success(damageService.listHistory()));
    }

    @Operation(summary = "Preview move (dry-run BFS)",
               description = "Tính kế hoạch đảo container chặn + slot đích trong kho hỏng, KHÔNG thực thi. "
                           + "Trả về thứ tự move để frontend show ghost preview.")
    @PostMapping("/{containerId}/preview-move")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<RelocationPlanResponse>> preview(@PathVariable String containerId) {
        return ResponseEntity.ok(ApiResponse.success(damageService.previewMove(containerId)));
    }

    @Operation(summary = "Pha 2 — chuyển vào kho hỏng",
               description = "Thực thi plan: đảo blocker rồi move target vào Kho hỏng. Body chứa thời gian sửa & tiền hoàn khách (optional).")
    @PostMapping("/{containerId}/move-to-damaged-yard")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<DamageReportResponse>> move(
            @PathVariable String containerId,
            @Valid @RequestBody(required = false) MoveToDamagedYardRequest body) {
        return ResponseEntity.ok(ApiResponse.success(damageService.moveToDamagedYard(containerId, body)));
    }

    @Operation(summary = "Huỷ báo hỏng",
               description = "Chỉ áp dụng khi report còn PENDING. Container trở về IN_YARD.")
    @DeleteMapping("/{containerId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<DamageReportResponse>> cancel(@PathVariable String containerId) {
        return ResponseEntity.ok(ApiResponse.success(damageService.cancel(containerId)));
    }

    @Operation(summary = "Preview chuyển về kho gốc (dry-run, không thực thi)",
               description = "Trả về vị trí ML chọn (slot, tier, zone, ml_score, final_score). Dùng để hiển thị "
                           + "modal confirm cho user trước khi gọi return-to-yard.")
    @PostMapping("/{containerId}/preview-return")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<SlotRecommendation>> previewReturn(@PathVariable String containerId) {
        return ResponseEntity.ok(ApiResponse.success(damageService.previewReturn(containerId)));
    }

    @Operation(summary = "Chuyển container đã sửa về kho gốc (ML chọn slot)",
               description = "Yêu cầu container ở repair_status=REPAIRED. Gọi ML qua OptimizationService để chọn "
                           + "slot tối ưu trong yard tương ứng cargo type, sau đó relocate. Container.status → IN_YARD, "
                           + "damage_report.status → RETURNED.")
    @PostMapping("/{containerId}/return-to-yard")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<DamageReportResponse>> returnToYard(@PathVariable String containerId) {
        return ResponseEntity.ok(ApiResponse.success(damageService.returnToYard(containerId)));
    }
}

package com.anhnht.warehouse.service.modules.damage.service;

import com.anhnht.warehouse.service.modules.damage.dto.DamageReportRequest;
import com.anhnht.warehouse.service.modules.damage.dto.DamageReportResponse;
import com.anhnht.warehouse.service.modules.damage.dto.MoveToDamagedYardRequest;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationPlanResponse;

import java.util.List;

public interface DamageReportService {

    /** Pha 1 — đánh dấu container hỏng, KHÔNG di chuyển. */
    DamageReportResponse report(DamageReportRequest req);

    /** Danh sách damage report đang chờ xử lý (status PENDING + RELOCATING). */
    List<DamageReportResponse> listPending();

    /** Tất cả damage report (mọi trạng thái trừ CANCELLED) - hiển thị trong "Quản lý kho hỏng". */
    List<DamageReportResponse> listAll();

    /** Lịch sử toàn bộ damage report (trừ CANCELLED), bao gồm cả RETURNED - dùng cho "Báo cáo thống kê". */
    List<DamageReportResponse> listHistory();

    /** Dry-run: tính plan đảo container chặn + slot đích trong kho hỏng, không thực thi. */
    RelocationPlanResponse previewMove(String containerId);

    /** Pha 2 — thực thi plan: đảo blocker rồi chuyển target vào kho hỏng. */
    DamageReportResponse moveToDamagedYard(String containerId, MoveToDamagedYardRequest req);

    /** Huỷ báo hỏng (chỉ áp dụng khi report còn PENDING). */
    DamageReportResponse cancel(String containerId);

    /**
     * Chuyển container đã sửa xong (repair_status = REPAIRED) về kho gốc theo cargo type.
     * Vị trí mới được chọn bởi ML qua OptimizationService.recommend().
     */
    DamageReportResponse returnToYard(String containerId);

    /**
     * Dry-run của returnToYard: gọi ML lấy slot tối ưu nhưng KHÔNG di chuyển.
     * Dùng để hiển thị preview cho user trước khi confirm.
     */
    com.anhnht.warehouse.service.modules.optimization.dto.response.SlotRecommendation previewReturn(String containerId);
}

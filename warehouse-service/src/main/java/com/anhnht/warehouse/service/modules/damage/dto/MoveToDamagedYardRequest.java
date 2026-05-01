package com.anhnht.warehouse.service.modules.damage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Schema(name = "MoveToDamagedYardRequest", description = "Body cho Pha 2 — kèm thông tin sửa chữa & hoàn tiền.")
public class MoveToDamagedYardRequest {

    @Schema(description = "Ngày dự kiến sửa xong (yyyy-MM-dd).", example = "2026-05-15")
    private LocalDate expectedRepairDate;

    @Schema(description = "Số tiền hoàn cho khách (VND).", example = "5000000")
    @DecimalMin("0.0")
    private BigDecimal compensationCost;

    @Schema(description = "Chi phí sửa chữa container (VND).", example = "1000000")
    @DecimalMin("0.0")
    private BigDecimal repairCost;

    @Schema(description = "Ghi chú thêm khi chuyển vào kho hỏng.", example = "Đã liên hệ chủ hàng, đồng ý hoàn 5tr.")
    private String repairNote;
}

package com.anhnht.warehouse.service.modules.damage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Schema(name = "DamageReportRequest", description = "Tạo báo cáo hỏng (Pha 1 — chỉ đánh dấu, không di chuyển).")
public class DamageReportRequest {

    @Schema(example = "HTHU0000001")
    @NotBlank
    @Size(max = 20)
    private String containerId;

    @Schema(example = "MAJOR", allowableValues = {"MINOR", "MAJOR", "CRITICAL"})
    @Size(max = 20)
    private String severity;

    @Schema(example = "Vỏ container móp nặng cạnh phía Bắc")
    @Size(max = 500)
    private String reason;

    @Schema(description = "Danh sách URL ảnh chụp.", example = "[\"https://cdn.example.com/d1.jpg\"]")
    private List<String> photoUrls;
}

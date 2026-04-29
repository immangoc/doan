package com.anhnht.warehouse.service.modules.optimization.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Request for slot placement recommendations.
 *
 * Either containerId (look up from DB) OR cargoTypeName + grossWeight must be provided.
 */
@Getter
@Setter
@Schema(
    name = "PlacementRequest",
    description = "Yêu cầu gợi ý vị trí. Truyền containerId (đã đăng ký) HOẶC cargoTypeName + grossWeight + sizeType.",
    example = """
        {
          "cargoTypeName": "Hàng Khô",
          "grossWeight": 15000,
          "sizeType": "20ft"
        }
        """
)
public class PlacementRequest {

    @Schema(
        description = "ID container đã đăng ký trong DB. Nếu có, các field khác bị bỏ qua, hệ thống tự lấy cargo type / weight / size từ DB.",
        example = "HTHU0000001",
        maxLength = 20
    )
    @Size(max = 20)
    private String containerId;

    @Schema(
        description = "Tên loại hàng. Phải khớp seed values DB.",
        example = "Hàng Khô",
        allowableValues = {"Hàng Khô", "Hàng Lạnh", "Hàng Dễ Vỡ", "Hàng Khác"}
    )
    private String cargoTypeName;

    @Schema(
        description = "Trọng lượng container (kg). Dùng cho hard constraint max_weight và làm feature input cho ML.",
        example = "15000",
        minimum = "0"
    )
    @DecimalMin("0.0")
    private BigDecimal grossWeight;

    @Schema(
        description = "Kích cỡ container — '20ft' hoặc '40ft'. Resolved từ container record khi truyền containerId.",
        example = "20ft",
        allowableValues = {"20ft", "40ft"}
    )
    @Size(max = 10)
    private String sizeType;
}

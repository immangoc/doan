package com.anhnht.warehouse.service.modules.damage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@Schema(name = "DamageReportResponse")
public class DamageReportResponse {

    private Integer       reportId;
    private String        containerId;
    private String        containerCode;
    private String        cargoTypeName;
    private String        sizeType;
    private String        currentYard;
    private String        currentZone;
    private Integer       currentTier;
    private String        currentSlot;
    private String        grossWeight;
    private String        severity;
    private String        reason;
    private List<String>  photoUrls;
    private String        reportedBy;
    private LocalDateTime reportedAt;
    private String        reportStatus;       // PENDING / RELOCATING / STORED / CANCELLED
    private LocalDateTime completedAt;

    // Repair / compensation info (set in Pha 2 hoặc khi cập nhật sau)
    private String        repairStatus;
    private LocalDateTime repairDate;
    private java.math.BigDecimal compensationCost;
    private Boolean       compensationRefunded;
    private LocalDateTime compensationRefundedAt;
}

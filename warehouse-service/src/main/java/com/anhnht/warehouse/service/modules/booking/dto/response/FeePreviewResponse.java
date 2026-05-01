package com.anhnht.warehouse.service.modules.booking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeePreviewResponse {

    private BigDecimal totalFee;
    private long storageDays;
    private BigDecimal timeMultiplier;
    private BigDecimal weightMultiplier;
    private List<ContainerFeeDetail> containerDetails;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContainerFeeDetail {
        private String containerId;
        private String containerTypeName;
        private String cargoTypeName;
        private Integer containerSize;
        private BigDecimal grossWeight;
        private BigDecimal dailyRate;
        private BigDecimal subtotal;
        private String tariffCode;
    }
}

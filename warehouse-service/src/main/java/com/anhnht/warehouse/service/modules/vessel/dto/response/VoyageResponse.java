package com.anhnht.warehouse.service.modules.vessel.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
public class VoyageResponse {
    private Integer       voyageId;
    private Integer       vesselId;
    private String        vesselName;
    private String        shippingLine;
    private String        voyageNo;
    private String        portOfLoading;
    private String        portOfDischarge;
    private LocalDateTime estimatedTimeArrival;
    private LocalDateTime actualTimeArrival;
    private LocalDateTime createdAt;
}

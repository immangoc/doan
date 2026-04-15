package com.anhnht.warehouse.service.modules.vessel.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class VoyageRequest {

    @NotNull(message = "Vessel ID is required")
    private Integer vesselId;

    @Size(max = 50)
    private String voyageNo;

    @Size(max = 100)
    private String portOfLoading;

    @Size(max = 100)
    private String portOfDischarge;

    private LocalDateTime estimatedTimeArrival;
    private LocalDateTime actualTimeArrival;
}

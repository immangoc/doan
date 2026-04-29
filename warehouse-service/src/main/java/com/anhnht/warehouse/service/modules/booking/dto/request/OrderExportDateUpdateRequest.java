package com.anhnht.warehouse.service.modules.booking.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class OrderExportDateUpdateRequest {

    @NotNull
    private LocalDate newExportDate;

    /**
     * If true, the calculated fee is debited from the customer's wallet.
     * If null/false, the request is treated as a preview only.
     */
    private Boolean confirmPayment;
}

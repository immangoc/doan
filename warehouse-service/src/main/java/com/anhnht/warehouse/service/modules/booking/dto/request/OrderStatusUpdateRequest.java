package com.anhnht.warehouse.service.modules.booking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderStatusUpdateRequest {

    @NotBlank
    private String statusName;
}

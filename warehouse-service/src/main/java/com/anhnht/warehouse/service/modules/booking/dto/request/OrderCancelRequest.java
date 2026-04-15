package com.anhnht.warehouse.service.modules.booking.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderCancelRequest {

    @Size(max = 255)
    private String reason;
}

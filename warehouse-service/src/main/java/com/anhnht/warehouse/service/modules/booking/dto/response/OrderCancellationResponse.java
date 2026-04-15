package com.anhnht.warehouse.service.modules.booking.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class OrderCancellationResponse {

    private Integer       cancellationId;
    private String        reason;
    private LocalDateTime createdAt;
}

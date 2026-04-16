package com.anhnht.warehouse.service.modules.booking.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
public class OrderResponse {

    private Integer       orderId;
    private Integer       customerId;
    private String        customerName;
    private String        phone;
    private String        email;
    private String        address;
    private String        statusName;
    private String        note;
    private LocalDateTime createdAt;

    private LocalDate importDate;
    private LocalDate exportDate;

    /** Total gross weight aggregated from linked containers. */
    private BigDecimal totalGrossWeight;

    /** Container IDs linked to this order. */
    private Set<String>   containerIds;

    /** Populated when order is cancelled. */
    private OrderCancellationResponse cancellation;
}

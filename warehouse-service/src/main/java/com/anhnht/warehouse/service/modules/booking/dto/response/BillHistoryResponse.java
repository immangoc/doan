package com.anhnht.warehouse.service.modules.booking.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class BillHistoryResponse {

    private Integer       historyId;
    private String        statusName;
    private String        description;
    private LocalDateTime createdAt;
}

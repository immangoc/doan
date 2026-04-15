package com.anhnht.warehouse.service.modules.gateout.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class GateOutReceiptResponse {

    private Integer       gateOutId;
    private String        containerId;
    private LocalDateTime gateOutTime;
    private Integer       createdById;
    private String        createdByUsername;
    private String        note;
}

package com.anhnht.warehouse.service.modules.booking.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BillOfLadingResponse {

    private Integer   billId;
    private Integer   orderId;
    private String    billNumber;
    private LocalDate createdDate;
    private String    statusName;
    private String    note;
}

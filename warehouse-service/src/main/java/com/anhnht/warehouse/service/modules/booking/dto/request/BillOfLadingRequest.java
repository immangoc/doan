package com.anhnht.warehouse.service.modules.booking.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BillOfLadingRequest {

    /** Optional: if blank, a bill number is auto-generated. */
    @Size(max = 50)
    private String billNumber;

    @Size(max = 255)
    private String note;
}

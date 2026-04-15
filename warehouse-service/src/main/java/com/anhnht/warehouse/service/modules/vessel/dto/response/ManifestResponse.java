package com.anhnht.warehouse.service.modules.vessel.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
public class ManifestResponse {
    private Integer   manifestId;
    private Integer   voyageId;
    private String    voyageNo;
    private String    vesselName;
    private LocalDate createdDate;
    private String    note;
}

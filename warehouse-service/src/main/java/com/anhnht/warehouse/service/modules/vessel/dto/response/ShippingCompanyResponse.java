package com.anhnht.warehouse.service.modules.vessel.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ShippingCompanyResponse {
    private Integer       companyId;
    private String        name;
    private String        phone;
    private String        email;
    private String        address;
    private String        code;
    private String        country;
    private LocalDateTime createdAt;
}

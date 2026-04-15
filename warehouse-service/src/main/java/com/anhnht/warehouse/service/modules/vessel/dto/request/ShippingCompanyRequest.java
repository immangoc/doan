package com.anhnht.warehouse.service.modules.vessel.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShippingCompanyRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100)
    private String name;

    @Size(max = 30)
    private String phone;

    @Size(max = 100)
    private String email;

    @Size(max = 255)
    private String address;
}

package com.anhnht.warehouse.service.modules.user.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserAddressRequest {

    @Size(max = 255)
    private String address;

    @Size(max = 100)
    private String ward;

    @Size(max = 100)
    private String district;

    @Size(max = 100)
    private String city;

    private Boolean isDefault = false;
}

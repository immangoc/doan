package com.anhnht.warehouse.service.modules.user.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserAddressResponse {
    private Integer addressId;
    private String  address;
    private String  ward;
    private String  district;
    private String  city;
    private Boolean isDefault;
}

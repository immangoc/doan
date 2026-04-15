package com.anhnht.warehouse.service.modules.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRequest {

    @Size(max = 100)
    private String fullName;

    @Email(message = "Email is not valid")
    private String email;

    @Size(max = 20)
    private String phone;
}

package com.anhnht.warehouse.service.modules.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private final String  token;
    private final long    expiresIn; // seconds
    private final Integer userId;
    private final String  username;
    private final String  email;
    private final String  role;
}

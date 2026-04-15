package com.anhnht.warehouse.service.modules.user.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
public class UserResponse {
    private Integer           userId;
    private String            username;
    private String            fullName;
    private String            email;
    private String            phone;
    private Integer           status;
    private LocalDateTime     createdAt;
    private Set<RoleResponse> roles;
}

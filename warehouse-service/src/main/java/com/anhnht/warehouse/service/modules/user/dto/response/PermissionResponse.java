package com.anhnht.warehouse.service.modules.user.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PermissionResponse {
    private Integer permissionId;
    private String  permissionName;
    private String  description;
}

package com.anhnht.warehouse.service.modules.user.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class SystemLogResponse {

    private Integer       logId;
    private Integer       userId;
    private String        username;
    private String        action;
    private String        description;
    private LocalDateTime createdAt;
}

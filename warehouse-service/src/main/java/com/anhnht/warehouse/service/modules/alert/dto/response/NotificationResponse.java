package com.anhnht.warehouse.service.modules.alert.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class NotificationResponse {

    private Integer       notificationId;
    private String        title;
    private String        description;
    private Boolean       isRead;
    private LocalDateTime createdAt;
}

package com.anhnht.warehouse.service.modules.chat.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MessageResponse {

    private Integer       messageId;
    private Integer       senderId;
    private String        senderName;
    private String        description;
    private LocalDateTime createdAt;
}

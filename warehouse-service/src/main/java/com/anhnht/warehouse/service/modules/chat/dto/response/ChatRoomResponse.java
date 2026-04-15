package com.anhnht.warehouse.service.modules.chat.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ChatRoomResponse {

    private Integer       roomId;
    private String        roomName;
    private String        typeName;
    private LocalDateTime createdAt;
}

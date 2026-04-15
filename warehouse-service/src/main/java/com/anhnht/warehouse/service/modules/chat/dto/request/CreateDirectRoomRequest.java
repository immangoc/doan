package com.anhnht.warehouse.service.modules.chat.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateDirectRoomRequest {

    @NotNull
    private Integer targetUserId;
}

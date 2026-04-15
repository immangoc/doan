package com.anhnht.warehouse.service.modules.chat.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoomRequest {

    @NotBlank
    private String roomName;

    /** Type name e.g. "SUPPORT", "GENERAL" */
    @NotBlank
    private String typeName;
}

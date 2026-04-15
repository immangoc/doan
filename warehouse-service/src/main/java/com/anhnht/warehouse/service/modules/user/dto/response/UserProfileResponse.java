package com.anhnht.warehouse.service.modules.user.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UserProfileResponse {
    private Integer   profileId;
    private String    gender;
    private LocalDate dateOfBirth;
    private String    nationalId;
}

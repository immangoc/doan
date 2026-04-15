package com.anhnht.warehouse.service.modules.container.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ExpectedExitDateRequest {

    @NotNull
    private LocalDate expectedExitDate;
}


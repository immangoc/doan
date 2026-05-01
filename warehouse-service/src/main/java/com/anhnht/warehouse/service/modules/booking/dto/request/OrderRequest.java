package com.anhnht.warehouse.service.modules.booking.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Setter
public class OrderRequest {

    @NotBlank
    @Size(max = 150)
    private String customerName;

    @Size(max = 20)
    private String phone;

    @Email
    @Size(max = 100)
    private String email;

    @Size(max = 255)
    private String address;

    @Size(max = 255)
    private String note;

    /** Optional: container IDs to link at creation time (admin use). */
    private Set<String> containerIds;

    private LocalDate importDate;
    private LocalDate exportDate;
    private Boolean confirmPayment;
}

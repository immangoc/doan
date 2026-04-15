package com.anhnht.warehouse.service.modules.booking.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bill_of_lading_status")
@Getter
@Setter
@NoArgsConstructor
public class BillOfLadingStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "status_id")
    private Integer statusId;

    @Column(name = "status_name", nullable = false, unique = true, length = 50)
    private String statusName;
}

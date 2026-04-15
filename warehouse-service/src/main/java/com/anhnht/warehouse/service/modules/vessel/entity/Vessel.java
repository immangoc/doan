package com.anhnht.warehouse.service.modules.vessel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "vessels")
@Getter
@Setter
@NoArgsConstructor
public class Vessel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vessel_id")
    private Integer vesselId;

    @Column(name = "vessel_name", nullable = false, length = 100)
    private String vesselName;

    @Column(name = "shipping_line", length = 100)
    private String shippingLine;
}

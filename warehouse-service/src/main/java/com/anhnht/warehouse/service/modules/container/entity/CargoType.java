package com.anhnht.warehouse.service.modules.container.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cargo_types")
@Getter
@Setter
@NoArgsConstructor
public class CargoType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cargo_type_id")
    private Integer cargoTypeId;

    @Column(name = "cargo_type_name", nullable = false, unique = true, length = 100)
    private String cargoTypeName;

    public CargoType(String cargoTypeName) {
        this.cargoTypeName = cargoTypeName;
    }
}

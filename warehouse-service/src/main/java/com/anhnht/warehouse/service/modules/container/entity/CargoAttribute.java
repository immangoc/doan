package com.anhnht.warehouse.service.modules.container.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cargo_attributes")
@Getter
@Setter
@NoArgsConstructor
public class CargoAttribute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attribute_id")
    private Integer attributeId;

    @Column(name = "attribute_name", nullable = false, unique = true, length = 100)
    private String attributeName;

    public CargoAttribute(String attributeName) {
        this.attributeName = attributeName;
    }
}

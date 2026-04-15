package com.anhnht.warehouse.service.modules.container.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "container_types")
@Getter
@Setter
@NoArgsConstructor
public class ContainerType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "container_type_id")
    private Integer containerTypeId;

    @Column(name = "container_type_name", nullable = false, unique = true, length = 50)
    private String containerTypeName;

    public ContainerType(String containerTypeName) {
        this.containerTypeName = containerTypeName;
    }
}

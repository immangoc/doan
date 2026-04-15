package com.anhnht.warehouse.service.modules.container.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * JPA entity for the container_statuses lookup table.
 * Distinct from the ContainerStatus enum in common/constant.
 */
@Entity
@Table(name = "container_statuses")
@Getter
@Setter
@NoArgsConstructor
public class ContainerStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "status_id")
    private Integer statusId;

    @Column(name = "status_name", nullable = false, unique = true, length = 50)
    private String statusName;
}

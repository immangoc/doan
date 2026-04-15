package com.anhnht.warehouse.service.modules.container.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "export_priority")
@Getter
@Setter
@NoArgsConstructor
public class ExportPriority {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "priority_id")
    private Integer priorityId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false, unique = true)
    private Container container;

    @Column(name = "priority_level")
    private Integer priorityLevel = 1;

    @Column(name = "note", length = 255)
    private String note;
}

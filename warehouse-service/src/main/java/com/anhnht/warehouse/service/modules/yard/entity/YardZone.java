package com.anhnht.warehouse.service.modules.yard.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "yard_zones")
@Getter
@Setter
@NoArgsConstructor
public class YardZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "zone_id")
    private Integer zoneId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "yard_id", nullable = false)
    private Yard yard;

    @Column(name = "zone_name", nullable = false, length = 50)
    private String zoneName;

    @Column(name = "capacity_slots", nullable = false)
    private Integer capacitySlots;
}

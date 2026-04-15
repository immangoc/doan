package com.anhnht.warehouse.service.modules.vessel.entity;

import com.anhnht.warehouse.service.common.base.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "voyages")
@Getter
@Setter
@NoArgsConstructor
public class Voyage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "voyage_id")
    private Integer voyageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vessel_id", nullable = false)
    private Vessel vessel;

    @Column(name = "voyage_no", length = 50)
    private String voyageNo;

    @Column(name = "port_of_loading", length = 100)
    private String portOfLoading;

    @Column(name = "port_of_discharge", length = 100)
    private String portOfDischarge;

    @Column(name = "estimated_time_arrival")
    private LocalDateTime estimatedTimeArrival;

    @Column(name = "actual_time_arrival")
    private LocalDateTime actualTimeArrival;
}

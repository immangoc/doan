package com.anhnht.warehouse.service.modules.gatein.entity;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.vessel.entity.Voyage;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "gate_in_receipt")
@Getter
@Setter
@NoArgsConstructor
public class GateInReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gate_in_id")
    private Integer gateInId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voyage_id")
    private Voyage voyage;

    @Column(name = "gate_in_time")
    private LocalDateTime gateInTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "note", length = 255)
    private String note;

    @PrePersist
    protected void onCreate() {
        if (gateInTime == null) gateInTime = LocalDateTime.now();
    }
}

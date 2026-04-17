package com.anhnht.warehouse.service.modules.gateout.entity;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "gate_out_receipt")
@Getter
@Setter
@NoArgsConstructor
public class GateOutReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gate_out_id")
    private Integer gateOutId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @Column(name = "gate_out_time")
    private LocalDateTime gateOutTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "note", length = 255)
    private String note;

    // Snapshot of the container's last known position at the moment of gate-out.
    // Populated before the ContainerPosition row is deleted, so exported
    // container listings can still show where it used to be.
    @Column(name = "last_yard_name", length = 100)
    private String lastYardName;

    @Column(name = "last_zone_name", length = 100)
    private String lastZoneName;

    @Column(name = "last_block_name", length = 100)
    private String lastBlockName;

    @Column(name = "last_row_no")
    private Integer lastRowNo;

    @Column(name = "last_bay_no")
    private Integer lastBayNo;

    @Column(name = "last_tier")
    private Integer lastTier;

    @PrePersist
    protected void onCreate() {
        if (gateOutTime == null) gateOutTime = LocalDateTime.now();
    }
}

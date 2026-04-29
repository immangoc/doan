package com.anhnht.warehouse.service.modules.damage.entity;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "container_position_history")
@Getter
@Setter
@NoArgsConstructor
public class ContainerPositionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Integer historyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_slot_id")
    private Slot fromSlot;

    @Column(name = "from_tier")
    private Integer fromTier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_slot_id", nullable = false)
    private Slot toSlot;

    @Column(name = "to_tier", nullable = false)
    private Integer toTier;

    @Column(name = "reason", length = 50)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "damage_report_id")
    private DamageReport damageReport;

    @Column(name = "moved_at")
    private LocalDateTime movedAt;

    @PrePersist
    void prePersist() {
        if (movedAt == null) movedAt = LocalDateTime.now();
    }
}

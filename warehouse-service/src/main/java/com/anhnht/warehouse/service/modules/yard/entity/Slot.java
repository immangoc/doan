package com.anhnht.warehouse.service.modules.yard.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "slots")
@Getter
@Setter
@NoArgsConstructor
public class Slot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "slot_id")
    private Integer slotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id", nullable = false)
    private Block block;

    @Column(name = "row_no", nullable = false)
    private Integer rowNo;

    @Column(name = "bay_no", nullable = false)
    private Integer bayNo;

    @Column(name = "max_tier")
    private Integer maxTier = 5;

    @Column(name = "is_locked")
    private Boolean isLocked = false;

    @Column(name = "lock_reason", length = 255)
    private String lockReason;
}

package com.anhnht.warehouse.service.modules.damage.entity;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "damage_report")
@Getter
@Setter
@NoArgsConstructor
public class DamageReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Integer reportId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @Column(name = "severity", length = 20)
    private String severity;

    @Column(name = "reason", length = 500)
    private String reason;

    /** JSON array of photo URLs. */
    @Column(name = "photo_urls", columnDefinition = "TEXT")
    private String photoUrls;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by")
    private User reportedBy;

    @Column(name = "reported_at")
    private LocalDateTime reportedAt;

    @Column(name = "report_status", length = 20, nullable = false)
    private String reportStatus;   // PENDING / RELOCATING / STORED / CANCELLED

    /** JSON list of executed moves: [{containerId, fromSlot, fromTier, toSlot, toTier}]. */
    @Column(name = "plan_json", columnDefinition = "TEXT")
    private String planJson;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    void prePersist() {
        if (reportedAt == null)   reportedAt   = LocalDateTime.now();
        if (reportStatus == null) reportStatus = "PENDING";
    }
}

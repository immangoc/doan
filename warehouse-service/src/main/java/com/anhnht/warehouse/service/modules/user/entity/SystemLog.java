package com.anhnht.warehouse.service.modules.user.entity;

import com.anhnht.warehouse.service.common.base.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "system_logs")
@Getter
@Setter
@NoArgsConstructor
public class SystemLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Integer logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // nullable — anonymous actions allowed

    @Column(name = "action", length = 255)
    private String action;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}

package com.anhnht.warehouse.service.modules.alert.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "alert_level")
@Getter
@Setter
@NoArgsConstructor
public class AlertLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "level_id")
    private Integer levelId;

    @Column(name = "level_name", nullable = false, unique = true, length = 50)
    private String levelName;
}

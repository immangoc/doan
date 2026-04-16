package com.anhnht.warehouse.service.modules.vessel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "schedules")
@Getter
@Setter
@NoArgsConstructor
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_id")
    private Integer scheduleId;

    @Column(name = "company_name", length = 100)
    private String companyName;

    @Column(name = "ship_name", length = 100)
    private String shipName;

    @Column(name = "type", length = 20)
    private String type = "import";

    @Column(name = "time_start")
    private LocalDateTime timeStart;

    @Column(name = "time_end")
    private LocalDateTime timeEnd;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "containers")
    private Integer containers = 0;

    @Column(name = "status", length = 30)
    private String status = "scheduled";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "ship_type", length = 50)
    private String shipType;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}

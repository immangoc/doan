package com.anhnht.warehouse.service.modules.vessel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "manifest")
@Getter
@Setter
@NoArgsConstructor
public class Manifest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "manifest_id")
    private Integer manifestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voyage_id", nullable = false)
    private Voyage voyage;

    @Column(name = "created_date")
    private LocalDate createdDate;

    @Column(name = "note", length = 255)
    private String note;

    @PrePersist
    protected void onCreate() {
        if (createdDate == null) createdDate = LocalDate.now();
    }
}

package com.anhnht.warehouse.service.modules.gatein.entity;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.yard.entity.Yard;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "yard_storage")
@Getter
@Setter
@NoArgsConstructor
public class YardStorage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "storage_id")
    private Integer storageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "yard_id", nullable = false)
    private Yard yard;

    @Column(name = "storage_start_date")
    private LocalDate storageStartDate;

    @Column(name = "storage_end_date")
    private LocalDate storageEndDate;

    @Column(name = "note", length = 255)
    private String note;

    @PrePersist
    protected void onCreate() {
        if (storageStartDate == null) storageStartDate = LocalDate.now();
    }
}

package com.anhnht.warehouse.service.modules.booking.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "bill_of_lading")
@Getter
@Setter
@NoArgsConstructor
public class BillOfLading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bill_id")
    private Integer billId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "bill_number", unique = true, nullable = false, length = 50)
    private String billNumber;

    @Column(name = "created_date")
    private LocalDate createdDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private BillOfLadingStatus status;

    @Column(name = "note", length = 255)
    private String note;

    @PrePersist
    protected void onCreate() {
        if (createdDate == null) createdDate = LocalDate.now();
    }
}

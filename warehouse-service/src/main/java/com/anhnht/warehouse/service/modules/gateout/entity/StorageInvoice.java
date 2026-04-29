package com.anhnht.warehouse.service.modules.gateout.entity;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "storage_invoice")
@Getter
@Setter
@NoArgsConstructor
public class StorageInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoice_id")
    private Integer invoiceId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false, unique = true)
    private Container container;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gate_out_id", nullable = false, unique = true)
    private GateOutReceipt gateOutReceipt;

    @Column(name = "storage_days", nullable = false)
    private Integer storageDays;

    @Column(name = "daily_rate", nullable = false, precision = 18, scale = 2)
    private BigDecimal dailyRate;

    @Column(name = "base_fee", nullable = false, precision = 18, scale = 2)
    private BigDecimal baseFee;

    @Column(name = "overdue_penalty", nullable = false, precision = 18, scale = 2)
    private BigDecimal overduePenalty;

    @Column(name = "total_fee", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalFee;

    @Column(name = "is_overdue", nullable = false)
    private Boolean isOverdue = false;

    @Column(name = "overdue_days", nullable = false)
    private Integer overdueDays = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

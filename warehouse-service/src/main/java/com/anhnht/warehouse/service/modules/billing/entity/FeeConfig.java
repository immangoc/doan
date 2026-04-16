package com.anhnht.warehouse.service.modules.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fee_config")
@Getter
@Setter
@NoArgsConstructor
public class FeeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "config_id")
    private Integer configId;

    @Column(name = "currency", length = 10)
    private String currency = "VND";

    @Column(name = "cost_rate", precision = 6, scale = 4)
    private BigDecimal costRate = BigDecimal.valueOf(0.35);

    @Column(name = "rate_per_kg_default", precision = 12, scale = 2)
    private BigDecimal ratePerKgDefault = BigDecimal.valueOf(1000);

    // Stored as JSON text: {"CargoTypeName": 1200.0}
    @Column(name = "rate_per_kg_by_type", columnDefinition = "text")
    private String ratePerKgByType = "{}";

    @Column(name = "lifting_fee_per_move", precision = 12, scale = 2)
    private BigDecimal liftingFeePerMove = BigDecimal.ZERO;

    @Column(name = "overdue_penalty_rate", precision = 6, scale = 4)
    private BigDecimal overduePenaltyRate = BigDecimal.ZERO;

    @Column(name = "cold_storage_surcharge", precision = 12, scale = 2)
    private BigDecimal coldStorageSurcharge = BigDecimal.ZERO;

    @Column(name = "hazmat_surcharge", precision = 12, scale = 2)
    private BigDecimal hazmatSurcharge = BigDecimal.ZERO;

    @Column(name = "free_storage_days")
    private Integer freeStorageDays = 3;

    @Column(name = "storage_multiplier", precision = 6, scale = 4)
    private BigDecimal storageMultiplier = BigDecimal.ONE;

    @Column(name = "weight_multiplier", precision = 6, scale = 4)
    private BigDecimal weightMultiplier = BigDecimal.ONE;

    @Column(name = "container_rate_20ft", precision = 12, scale = 2)
    private BigDecimal containerRate20ft = BigDecimal.ZERO;

    @Column(name = "container_rate_40ft", precision = 12, scale = 2)
    private BigDecimal containerRate40ft = BigDecimal.ZERO;

    @Column(name = "early_pickup_fee", precision = 12, scale = 2)
    private BigDecimal earlyPickupFee = BigDecimal.ZERO;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}

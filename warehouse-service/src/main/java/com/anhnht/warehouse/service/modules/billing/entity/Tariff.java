package com.anhnht.warehouse.service.modules.billing.entity;

import com.anhnht.warehouse.service.modules.container.entity.CargoType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "tariffs")
@Getter
@Setter
@NoArgsConstructor
public class Tariff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tariff_id")
    private Integer tariffId;

    @Column(name = "tariff_code", length = 50, nullable = false, unique = true)
    private String tariffCode;

    @Column(name = "tariff_name", length = 150, nullable = false)
    private String tariffName;

    @Column(name = "fee_type", length = 50, nullable = false)
    private String feeType;

    @Column(name = "container_size")
    private Integer containerSize;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cargo_type_id")
    private CargoType cargoType;

    @Column(name = "unit_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "unit", length = 50, nullable = false)
    private String unit;

    @Column(name = "effective_date")
    private LocalDate effectiveDate = LocalDate.now();

    @Column(name = "note", length = 255)
    private String note;
}

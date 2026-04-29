package com.anhnht.warehouse.service.modules.container.entity;

import com.anhnht.warehouse.service.common.base.BaseEntity;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.vessel.entity.Manifest;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "container")
@Getter
@Setter
@NoArgsConstructor
public class Container extends BaseEntity {

    @Id
    @Column(name = "container_id", length = 20)
    private String containerId; // user-supplied, NOT auto-generated

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manifest_id")
    private Manifest manifest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_type_id")
    private ContainerType containerType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id")
    private ContainerStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cargo_type_id")
    private CargoType cargoType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attribute_id")
    private CargoAttribute attribute;

    @Column(name = "gross_weight", precision = 10, scale = 2)
    private BigDecimal grossWeight;

    @Column(name = "seal_number", length = 50)
    private String sealNumber;

    @Column(name = "note", length = 255)
    private String note;

    @Column(name = "declared_value", precision = 15, scale = 2)
    private BigDecimal declaredValue;

    @Column(name = "repair_status", length = 50)
    private String repairStatus;

    @Column(name = "repair_date")
    private LocalDateTime repairDate;

    @Column(name = "compensation_cost", precision = 15, scale = 2)
    private BigDecimal compensationCost;

    @Column(name = "compensation_refunded", nullable = false)
    private Boolean compensationRefunded = false;

    @Column(name = "compensation_refunded_at")
    private LocalDateTime compensationRefundedAt;
}

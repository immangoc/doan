package com.anhnht.warehouse.service.modules.wallet.entity;

import com.anhnht.warehouse.service.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "withdraw_requests")
@Getter
@Setter
@NoArgsConstructor
public class WithdrawRequest {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "withdraw_id", nullable = false, updatable = false)
    private UUID withdrawId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private WithdrawStatus status = WithdrawStatus.PENDING;

    @Column(name = "bank_name", length = 100, nullable = false)
    private String bankName;

    @Column(name = "bank_account", length = 100, nullable = false)
    private String bankAccount;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private User processedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

package com.anhnht.warehouse.service.modules.yard.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "yards")
@Getter
@Setter
@NoArgsConstructor
public class Yard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "yard_id")
    private Integer yardId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "yard_type_id")
    private YardType yardType;

    @Column(name = "yard_name", nullable = false, length = 100)
    private String yardName;

    @Column(name = "address", length = 255)
    private String address;
}

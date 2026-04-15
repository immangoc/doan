package com.anhnht.warehouse.service.modules.yard.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "yard_types")
@Getter
@Setter
@NoArgsConstructor
public class YardType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "yard_type_id")
    private Integer yardTypeId;

    @Column(name = "yard_type_name", nullable = false, unique = true, length = 50)
    private String yardTypeName;
}

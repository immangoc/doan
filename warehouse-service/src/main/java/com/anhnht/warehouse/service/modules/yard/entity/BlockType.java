package com.anhnht.warehouse.service.modules.yard.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "block_types")
@Getter
@Setter
@NoArgsConstructor
public class BlockType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "block_type_id")
    private Integer blockTypeId;

    @Column(name = "block_type_name", nullable = false, unique = true, length = 50)
    private String blockTypeName;
}

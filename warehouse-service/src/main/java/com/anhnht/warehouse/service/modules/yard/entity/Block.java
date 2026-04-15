package com.anhnht.warehouse.service.modules.yard.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "blocks")
@Getter
@Setter
@NoArgsConstructor
public class Block {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "block_id")
    private Integer blockId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private YardZone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_type_id")
    private BlockType blockType;

    @Column(name = "block_name", nullable = false, length = 50)
    private String blockName;
}

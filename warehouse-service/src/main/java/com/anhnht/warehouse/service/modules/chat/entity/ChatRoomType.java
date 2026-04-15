package com.anhnht.warehouse.service.modules.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "chat_room_type")
@Getter
@Setter
@NoArgsConstructor
public class ChatRoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "type_id")
    private Integer typeId;

    @Column(name = "type_name", nullable = false, unique = true, length = 50)
    private String typeName;
}

package com.anhnht.warehouse.service.modules.chat.repository;

import com.anhnht.warehouse.service.modules.chat.entity.ChatRoomType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatRoomTypeRepository extends JpaRepository<ChatRoomType, Integer> {

    Optional<ChatRoomType> findByTypeNameIgnoreCase(String typeName);
}

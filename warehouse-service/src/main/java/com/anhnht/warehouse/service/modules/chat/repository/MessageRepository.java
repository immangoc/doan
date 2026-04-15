package com.anhnht.warehouse.service.modules.chat.repository;

import com.anhnht.warehouse.service.modules.chat.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, Integer> {

    @EntityGraph(attributePaths = {"sender"})
    @Query("SELECT m FROM Message m WHERE m.room.roomId = :roomId ORDER BY m.createdAt DESC")
    Page<Message> findByRoomId(@Param("roomId") Integer roomId, Pageable pageable);
}

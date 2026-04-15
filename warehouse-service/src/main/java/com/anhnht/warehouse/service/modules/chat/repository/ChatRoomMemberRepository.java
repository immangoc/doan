package com.anhnht.warehouse.service.modules.chat.repository;

import com.anhnht.warehouse.service.modules.chat.entity.ChatRoomMember;
import com.anhnht.warehouse.service.modules.chat.entity.ChatRoomMemberId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, ChatRoomMemberId> {

    boolean existsByIdRoomIdAndIdUserId(Integer roomId, Integer userId);

    @EntityGraph(attributePaths = {"user"})
    @Query("SELECT m FROM ChatRoomMember m WHERE m.room.roomId = :roomId")
    List<ChatRoomMember> findByRoomId(@Param("roomId") Integer roomId);
}

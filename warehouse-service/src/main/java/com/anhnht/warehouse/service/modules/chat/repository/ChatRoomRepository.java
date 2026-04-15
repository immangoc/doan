package com.anhnht.warehouse.service.modules.chat.repository;

import com.anhnht.warehouse.service.modules.chat.entity.ChatRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Integer> {

    /** Rooms the current user is a member of. */
    @EntityGraph(attributePaths = {"type"})
    @Query("SELECT r FROM ChatRoom r JOIN ChatRoomMember m ON m.room = r WHERE m.user.userId = :userId")
    Page<ChatRoom> findByMemberUserId(@Param("userId") Integer userId, Pageable pageable);

    /** Admin: all rooms. */
    @EntityGraph(attributePaths = {"type"})
    Page<ChatRoom> findAll(Pageable pageable);

    /** Find rooms where both users are members (direct conversation). */
    @EntityGraph(attributePaths = {"type"})
    @Query("SELECT r FROM ChatRoom r " +
           "WHERE EXISTS (SELECT m1 FROM ChatRoomMember m1 WHERE m1.room = r AND m1.user.userId = :userId1) " +
           "AND EXISTS (SELECT m2 FROM ChatRoomMember m2 WHERE m2.room = r AND m2.user.userId = :userId2)")
    List<ChatRoom> findRoomsWithBothMembers(@Param("userId1") Integer userId1,
                                            @Param("userId2") Integer userId2);
}

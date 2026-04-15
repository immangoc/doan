package com.anhnht.warehouse.service.modules.chat.service;

import com.anhnht.warehouse.service.modules.chat.entity.ChatRoom;
import com.anhnht.warehouse.service.modules.chat.entity.ChatRoomType;
import com.anhnht.warehouse.service.modules.chat.entity.Message;
import com.anhnht.warehouse.service.modules.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ChatService {

    List<ChatRoomType> getRoomTypes();

    ChatRoom createRoom(Integer creatorId, String roomName, String typeName);

    Page<ChatRoom> getMyRooms(Integer userId, Pageable pageable);

    Page<ChatRoom> getAllRooms(Pageable pageable);

    void addMember(Integer roomId, Integer requesterId, Integer newUserId);

    Message sendMessage(Integer roomId, Integer senderId, String description);

    Page<Message> getMessages(Integer roomId, Integer requesterId, Pageable pageable);

    /** Search users by role name and optional keyword (fullName / username). */
    Page<User> searchUsers(String roleName, String keyword, Pageable pageable);

    /** Find existing 1-1 room between two users, or create one. */
    ChatRoom findOrCreateDirectRoom(Integer userId1, Integer userId2);
}

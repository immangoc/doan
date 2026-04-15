package com.anhnht.warehouse.service.modules.chat.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ForbiddenException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.chat.entity.*;
import com.anhnht.warehouse.service.modules.chat.repository.*;
import com.anhnht.warehouse.service.modules.chat.service.ChatService;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatServiceImpl implements ChatService {

    private final ChatRoomRepository       chatRoomRepository;
    private final ChatRoomTypeRepository   chatRoomTypeRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final MessageRepository        messageRepository;
    private final UserRepository           userRepository;

    @Override
    public List<ChatRoomType> getRoomTypes() {
        return chatRoomTypeRepository.findAll();
    }

    @Override
    @Transactional
    public ChatRoom createRoom(Integer creatorId, String roomName, String typeName) {
        ChatRoomType type = chatRoomTypeRepository.findByTypeNameIgnoreCase(typeName)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Chat room type not found: " + typeName));

        User creator = findUser(creatorId);

        ChatRoom room = new ChatRoom();
        room.setRoomName(roomName);
        room.setType(type);
        ChatRoom saved = chatRoomRepository.save(room);

        // Auto-add creator as 'owner'
        ChatRoomMember member = new ChatRoomMember();
        member.setId(new ChatRoomMemberId(saved.getRoomId(), creatorId));
        member.setRoom(saved);
        member.setUser(creator);
        member.setRole("owner");
        chatRoomMemberRepository.save(member);

        return saved;
    }

    @Override
    public Page<ChatRoom> getMyRooms(Integer userId, Pageable pageable) {
        return chatRoomRepository.findByMemberUserId(userId, pageable);
    }

    @Override
    public Page<ChatRoom> getAllRooms(Pageable pageable) {
        return chatRoomRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public void addMember(Integer roomId, Integer requesterId, Integer newUserId) {
        ChatRoom room = findRoom(roomId);

        // Only room owner or ADMIN can add members — checked by role in member table
        boolean isOwner = chatRoomMemberRepository.existsByIdRoomIdAndIdUserId(roomId, requesterId);
        if (!isOwner) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }

        if (chatRoomMemberRepository.existsByIdRoomIdAndIdUserId(roomId, newUserId)) {
            throw new BusinessException(ErrorCode.ALREADY_EXISTS, "User is already a member of this room");
        }

        User newUser = findUser(newUserId);
        ChatRoomMember member = new ChatRoomMember();
        member.setId(new ChatRoomMemberId(roomId, newUserId));
        member.setRoom(room);
        member.setUser(newUser);
        member.setRole("member");
        chatRoomMemberRepository.save(member);
    }

    @Override
    @Transactional
    public Message sendMessage(Integer roomId, Integer senderId, String description) {
        ChatRoom room = findRoom(roomId);

        if (!chatRoomMemberRepository.existsByIdRoomIdAndIdUserId(roomId, senderId)) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }

        User sender = findUser(senderId);
        Message msg = new Message();
        msg.setRoom(room);
        msg.setSender(sender);
        msg.setDescription(description);
        return messageRepository.save(msg);
    }

    @Override
    public Page<Message> getMessages(Integer roomId, Integer requesterId, Pageable pageable) {
        if (!chatRoomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Chat room not found: " + roomId);
        }
        if (!chatRoomMemberRepository.existsByIdRoomIdAndIdUserId(roomId, requesterId)) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }
        return messageRepository.findByRoomId(roomId, pageable);
    }

    @Override
    public Page<User> searchUsers(String roleName, String keyword, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();
        return userRepository.findByRoleNameAndKeyword(roleName, kw, pageable);
    }

    @Override
    @Transactional
    public ChatRoom findOrCreateDirectRoom(Integer userId1, Integer userId2) {
        List<ChatRoom> existing = chatRoomRepository.findRoomsWithBothMembers(userId1, userId2);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        // Look up or create SUPPORT type
        ChatRoomType type = chatRoomTypeRepository.findByTypeNameIgnoreCase("SUPPORT")
                .orElseGet(() -> {
                    ChatRoomType t = new ChatRoomType();
                    t.setTypeName("SUPPORT");
                    return chatRoomTypeRepository.save(t);
                });

        User u1 = findUser(userId1);
        User u2 = findUser(userId2);

        ChatRoom room = new ChatRoom();
        room.setRoomName("Chat: " + u1.getFullName() + " & " + u2.getFullName());
        room.setType(type);
        ChatRoom saved = chatRoomRepository.save(room);

        ChatRoomMember m1 = new ChatRoomMember();
        m1.setId(new ChatRoomMemberId(saved.getRoomId(), userId1));
        m1.setRoom(saved);
        m1.setUser(u1);
        m1.setRole("owner");
        chatRoomMemberRepository.save(m1);

        ChatRoomMember m2 = new ChatRoomMember();
        m2.setId(new ChatRoomMemberId(saved.getRoomId(), userId2));
        m2.setRoom(saved);
        m2.setUser(u2);
        m2.setRole("member");
        chatRoomMemberRepository.save(m2);

        return saved;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private ChatRoom findRoom(Integer roomId) {
        return chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Chat room not found: " + roomId));
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "User not found: " + userId));
    }
}

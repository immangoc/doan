package com.anhnht.warehouse.service.modules.chat.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.chat.dto.request.CreateDirectRoomRequest;
import com.anhnht.warehouse.service.modules.chat.dto.request.CreateRoomRequest;
import com.anhnht.warehouse.service.modules.chat.dto.request.SendMessageRequest;
import com.anhnht.warehouse.service.modules.chat.dto.response.ChatRoomResponse;
import com.anhnht.warehouse.service.modules.chat.dto.response.ChatRoomTypeResponse;
import com.anhnht.warehouse.service.modules.chat.dto.response.ChatUserResponse;
import com.anhnht.warehouse.service.modules.chat.dto.response.MessageResponse;
import com.anhnht.warehouse.service.modules.chat.mapper.ChatMapper;
import com.anhnht.warehouse.service.modules.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ChatController {

    private final ChatService chatService;
    private final ChatMapper  chatMapper;

    /**
     * GET /chat/room-types
     * List all available chat room types.
     */
    @GetMapping("/chat/room-types")
    public ResponseEntity<ApiResponse<List<ChatRoomTypeResponse>>> getRoomTypes() {
        List<ChatRoomTypeResponse> types = chatService.getRoomTypes()
                .stream()
                .map(t -> new ChatRoomTypeResponse(t.getTypeId(), t.getTypeName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(types));
    }

    /**
     * POST /chat/rooms
     * Create a new chat room. The creator is automatically added as owner.
     */
    @PostMapping("/chat/rooms")
    public ResponseEntity<ApiResponse<ChatRoomResponse>> createRoom(
            @Valid @RequestBody CreateRoomRequest request) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(201).body(ApiResponse.created(
                chatMapper.toChatRoomResponse(
                        chatService.createRoom(userId, request.getRoomName(), request.getTypeName()))));
    }

    /**
     * GET /chat/rooms
     * Get all rooms the current user is a member of.
     */
    @GetMapping("/chat/rooms")
    public ResponseEntity<ApiResponse<PageResponse<ChatRoomResponse>>> getMyRooms(
            @PageableDefault(size = 20) Pageable pageable) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(chatService.getMyRooms(userId, pageable)
                        .map(chatMapper::toChatRoomResponse))));
    }

    /**
     * POST /chat/rooms/{roomId}/members/{userId}
     * Add a user to a room (only current members can add).
     */
    @PostMapping("/chat/rooms/{roomId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @PathVariable Integer roomId,
            @PathVariable Integer userId) {
        Integer requesterId = SecurityUtils.getCurrentUserId();
        chatService.addMember(roomId, requesterId, userId);
        return ResponseEntity.ok(ApiResponse.noContent("Member added"));
    }

    /**
     * POST /chat/rooms/{roomId}/messages
     * Send a message to a room (must be a member).
     */
    @PostMapping("/chat/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<MessageResponse>> sendMessage(
            @PathVariable Integer roomId,
            @Valid @RequestBody SendMessageRequest request) {
        Integer senderId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(201).body(ApiResponse.created(
                chatMapper.toMessageResponse(
                        chatService.sendMessage(roomId, senderId, request.getDescription()))));
    }

    /**
     * GET /chat/rooms/{roomId}/messages
     * Get paginated messages for a room (must be a member). Latest first.
     */
    @GetMapping("/chat/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<PageResponse<MessageResponse>>> getMessages(
            @PathVariable Integer roomId,
            @PageableDefault(size = 30) Pageable pageable) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(chatService.getMessages(roomId, userId, pageable)
                        .map(chatMapper::toMessageResponse))));
    }

    /**
     * GET /chat/users?roleName=CUSTOMER&keyword=Lan
     * Search users by role and optional name keyword (for starting conversations).
     */
    @GetMapping("/chat/users")
    public ResponseEntity<ApiResponse<PageResponse<ChatUserResponse>>> searchUsers(
            @RequestParam String roleName,
            @RequestParam(required = false, defaultValue = "") String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(chatService.searchUsers(roleName, keyword, pageable)
                        .map(chatMapper::toChatUserResponse))));
    }

    /**
     * POST /chat/conversations
     * Find or create a direct 1-1 conversation between current user and target.
     */
    @PostMapping("/chat/conversations")
    public ResponseEntity<ApiResponse<ChatRoomResponse>> findOrCreateConversation(
            @Valid @RequestBody CreateDirectRoomRequest request) {
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                chatMapper.toChatRoomResponse(
                        chatService.findOrCreateDirectRoom(currentUserId, request.getTargetUserId()))));
    }

    /**
     * GET /admin/chat/rooms
     * Admin: list all chat rooms.
     */
    @GetMapping("/admin/chat/rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<ChatRoomResponse>>> getAllRooms(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(chatService.getAllRooms(pageable)
                        .map(chatMapper::toChatRoomResponse))));
    }
}

package com.anhnht.warehouse.service.modules.alert.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.alert.dto.response.NotificationResponse;
import com.anhnht.warehouse.service.modules.alert.mapper.AlertMapper;
import com.anhnht.warehouse.service.modules.alert.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;
    private final AlertMapper         alertMapper;

    /**
     * GET /notifications/my
     * Paginated list of notifications for the authenticated user.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getMyNotifications(
            @PageableDefault(size = 20) Pageable pageable) {

        Integer userId = SecurityUtils.getCurrentUserId();
        Page<NotificationResponse> page = notificationService.getMyNotifications(userId, pageable)
                .map(alertMapper::toNotificationResponse);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(page)));
    }

    /**
     * GET /notifications/unread-count
     * Count of unread notifications for the authenticated user.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> countUnread() {
        Integer userId = SecurityUtils.getCurrentUserId();
        long count = notificationService.countUnread(userId);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    /**
     * PUT /notifications/{id}/read
     * Mark a specific notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(@PathVariable Integer id) {
        Integer userId = SecurityUtils.getCurrentUserId();
        notificationService.markRead(userId, id);
        return ResponseEntity.ok(ApiResponse.noContent("Notification marked as read"));
    }

    /**
     * PUT /notifications/read-all
     * Mark all notifications as read for the authenticated user.
     */
    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead() {
        Integer userId = SecurityUtils.getCurrentUserId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok(ApiResponse.noContent("All notifications marked as read"));
    }
}

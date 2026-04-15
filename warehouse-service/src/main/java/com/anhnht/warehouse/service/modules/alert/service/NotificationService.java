package com.anhnht.warehouse.service.modules.alert.service;

import com.anhnht.warehouse.service.modules.alert.entity.UserNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {

    Page<UserNotification> getMyNotifications(Integer userId, Pageable pageable);
    long countUnread(Integer userId);
    void markRead(Integer userId, Integer notificationId);
    void markAllRead(Integer userId);

    /**
     * Internal: create a notification and deliver it to the given user IDs.
     * Called by scheduler after creating alerts.
     */
    void notify(String title, String description, Integer... userIds);
}

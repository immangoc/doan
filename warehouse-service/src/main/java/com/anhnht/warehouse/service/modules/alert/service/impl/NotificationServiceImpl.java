package com.anhnht.warehouse.service.modules.alert.service.impl;

import com.anhnht.warehouse.service.modules.alert.entity.Notification;
import com.anhnht.warehouse.service.modules.alert.entity.UserNotification;
import com.anhnht.warehouse.service.modules.alert.entity.UserNotificationId;
import com.anhnht.warehouse.service.modules.alert.repository.NotificationRepository;
import com.anhnht.warehouse.service.modules.alert.repository.UserNotificationRepository;
import com.anhnht.warehouse.service.modules.alert.service.NotificationService;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository     notificationRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final UserRepository             userRepository;

    @Override
    public Page<UserNotification> getMyNotifications(Integer userId, Pageable pageable) {
        return userNotificationRepository.findByIdUserId(userId, pageable);
    }

    @Override
    public long countUnread(Integer userId) {
        return userNotificationRepository.countByIdUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public void markRead(Integer userId, Integer notificationId) {
        UserNotificationId id = new UserNotificationId(notificationId, userId);
        userNotificationRepository.findById(id).ifPresent(un -> {
            un.setIsRead(true);
            userNotificationRepository.save(un);
        });
    }

    @Override
    @Transactional
    public void markAllRead(Integer userId) {
        userNotificationRepository.markAllReadForUser(userId);
    }

    @Override
    @Transactional
    public void notify(String title, String description, Integer... userIds) {
        if (userIds == null || userIds.length == 0) return;

        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setDescription(description);
        Notification saved = notificationRepository.save(notification);

        for (Integer userId : userIds) {
            userRepository.findById(userId).ifPresent(user -> {
                UserNotification un = new UserNotification();
                un.setId(new UserNotificationId(saved.getNotificationId(), userId));
                un.setNotification(saved);
                un.setUser(user);
                userNotificationRepository.save(un);
            });
        }
    }
}

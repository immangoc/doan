package com.anhnht.warehouse.service.modules.alert.repository;

import com.anhnht.warehouse.service.modules.alert.entity.UserNotification;
import com.anhnht.warehouse.service.modules.alert.entity.UserNotificationId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserNotificationRepository extends JpaRepository<UserNotification, UserNotificationId> {

    @EntityGraph(attributePaths = {"notification"})
    Page<UserNotification> findByIdUserId(Integer userId, Pageable pageable);

    long countByIdUserIdAndIsReadFalse(Integer userId);

    @Modifying
    @Query("UPDATE UserNotification un SET un.isRead = true " +
           "WHERE un.id.userId = :userId AND un.isRead = false")
    void markAllReadForUser(@Param("userId") Integer userId);
}

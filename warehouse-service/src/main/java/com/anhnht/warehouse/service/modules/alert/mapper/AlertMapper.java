package com.anhnht.warehouse.service.modules.alert.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.alert.dto.response.AlertResponse;
import com.anhnht.warehouse.service.modules.alert.dto.response.NotificationResponse;
import com.anhnht.warehouse.service.modules.alert.entity.Alert;
import com.anhnht.warehouse.service.modules.alert.entity.UserNotification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CommonMapperConfig.class)
public interface AlertMapper {

    @Mapping(source = "zone.zoneId",   target = "zoneId")
    @Mapping(source = "zone.zoneName", target = "zoneName")
    @Mapping(source = "level.levelName", target = "levelName")
    AlertResponse toAlertResponse(Alert alert);

    @Mapping(source = "notification.notificationId", target = "notificationId")
    @Mapping(source = "notification.title",          target = "title")
    @Mapping(source = "notification.description",    target = "description")
    @Mapping(source = "notification.createdAt",      target = "createdAt")
    @Mapping(source = "isRead",                      target = "isRead")
    NotificationResponse toNotificationResponse(UserNotification userNotification);
}

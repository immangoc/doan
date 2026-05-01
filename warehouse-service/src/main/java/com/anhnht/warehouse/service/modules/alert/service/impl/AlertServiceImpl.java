package com.anhnht.warehouse.service.modules.alert.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.alert.dto.request.IncidentReportRequest;
import com.anhnht.warehouse.service.modules.alert.entity.Alert;
import com.anhnht.warehouse.service.modules.alert.entity.AlertLevel;
import com.anhnht.warehouse.service.modules.alert.entity.Notification;
import com.anhnht.warehouse.service.modules.alert.repository.AlertLevelRepository;
import com.anhnht.warehouse.service.modules.alert.repository.AlertRepository;
import com.anhnht.warehouse.service.modules.alert.repository.NotificationRepository;
import com.anhnht.warehouse.service.modules.alert.service.AlertService;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import com.anhnht.warehouse.service.modules.yard.repository.YardZoneRepository;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AlertServiceImpl implements AlertService {

    private final AlertRepository      alertRepository;
    private final AlertLevelRepository levelRepository;
    private final NotificationRepository notificationRepository;
    private final ContainerService     containerService;
    private final YardZoneRepository   yardZoneRepository;
    private final UserRepository       userRepository;

    @Override
    public Page<Alert> findAll(Short status, String levelName, Pageable pageable) {
        return alertRepository.findAllFiltered(status, levelName, pageable);
    }

    @Override
    public Page<Alert> findByZone(Integer zoneId, Pageable pageable) {
        return alertRepository.findByZoneId(zoneId, pageable);
    }

    @Override
    public Alert findById(Integer alertId) {
        return alertRepository.findByIdWithDetails(alertId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ALERT_NOT_FOUND,
                        "Alert not found: " + alertId));
    }

    @Override
    @Transactional
    public Alert acknowledge(Integer alertId) {
        Alert alert = findById(alertId);
        alert.setStatus((short) 1);
        return alertRepository.save(alert);
    }

    @Override
    @Transactional
    public Alert createAlert(YardZone zone, String levelName, String description) {
        AlertLevel level = levelRepository.findByLevelNameIgnoreCase(levelName)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Alert level not found: " + levelName));
        Alert alert = new Alert();
        alert.setZone(zone);
        alert.setLevel(level);
        alert.setDescription(description);
        return alertRepository.save(alert);
    }

    @Override
    @Transactional
    public Alert createIncidentReport(IncidentReportRequest request) {
        AlertLevel level = levelRepository.findByLevelNameIgnoreCase(request.getLevelName())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Alert level not found: " + request.getLevelName()));

        Alert alert = new Alert();
        alert.setLevel(level);
        alert.setDescription(request.getDescription());
        alert.setStatus((short) 0); // Chờ duyệt

        if (request.getZoneId() != null) {
            YardZone zone = yardZoneRepository.findById(request.getZoneId())
                    .orElse(null);
            alert.setZone(zone);
        }

        if (request.getContainerId() != null && !request.getContainerId().isBlank()) {
            try {
                Container container = containerService.findById(request.getContainerId());
                alert.setContainer(container);
            } catch (Exception ignored) {
                // Container not found — proceed without linking
            }
        }

        // Set the reporter to the current logged-in user
        try {
            Integer userId = SecurityUtils.getCurrentUserId();
            if (userId != null) {
                userRepository.findById(userId).ifPresent(alert::setReportedBy);
            }
        } catch (Exception ignored) {
            // Not logged in — proceed without reporter
        }

        Alert saved = alertRepository.save(alert);

        // Create notification for operator/admin
        Notification notif = new Notification();
        String reporter = saved.getReportedBy() != null ? saved.getReportedBy().getUsername() : "Nhân viên";
        String zoneInfo = saved.getZone() != null ? " tại " + saved.getZone().getZoneName() : "";
        notif.setTitle("Báo cáo sự cố mới [" + request.getLevelName() + "]");
        notif.setDescription(reporter + " báo cáo: " + request.getDescription() + zoneInfo);
        notificationRepository.save(notif);

        return saved;
    }

    @Override
    @Transactional
    public void deleteAlert(Integer alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ALERT_NOT_FOUND,
                        "Alert not found: " + alertId));
        alertRepository.delete(alert);
    }
}


package com.anhnht.warehouse.service.modules.alert.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.alert.entity.Alert;
import com.anhnht.warehouse.service.modules.alert.entity.AlertLevel;
import com.anhnht.warehouse.service.modules.alert.repository.AlertLevelRepository;
import com.anhnht.warehouse.service.modules.alert.repository.AlertRepository;
import com.anhnht.warehouse.service.modules.alert.service.AlertService;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
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
}

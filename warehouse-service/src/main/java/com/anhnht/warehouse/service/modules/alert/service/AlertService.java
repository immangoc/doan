package com.anhnht.warehouse.service.modules.alert.service;

import com.anhnht.warehouse.service.modules.alert.dto.request.IncidentReportRequest;
import com.anhnht.warehouse.service.modules.alert.entity.Alert;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AlertService {

    Page<Alert> findAll(Short status, String levelName, Pageable pageable);
    Page<Alert> findByZone(Integer zoneId, Pageable pageable);
    Alert findById(Integer alertId);
    Alert acknowledge(Integer alertId);

    /** Internal: create an alert record. Called by scheduler. */
    Alert createAlert(YardZone zone, String levelName, String description);

    /** Yard staff: create an incident report. */
    Alert createIncidentReport(IncidentReportRequest request);

    /** Delete an alert by ID. */
    void deleteAlert(Integer alertId);
}


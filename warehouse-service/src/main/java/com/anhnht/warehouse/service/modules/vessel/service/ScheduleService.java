package com.anhnht.warehouse.service.modules.vessel.service;

import com.anhnht.warehouse.service.modules.vessel.dto.request.ScheduleRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.Schedule;

import java.util.List;

public interface ScheduleService {
    List<Schedule> findAll();
    Schedule findById(Integer id);
    Schedule create(ScheduleRequest request);
    Schedule update(Integer id, ScheduleRequest request);
    void delete(Integer id);
}

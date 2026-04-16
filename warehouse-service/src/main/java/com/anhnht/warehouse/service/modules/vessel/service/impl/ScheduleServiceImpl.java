package com.anhnht.warehouse.service.modules.vessel.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.vessel.dto.request.ScheduleRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.Schedule;
import com.anhnht.warehouse.service.modules.vessel.repository.ScheduleRepository;
import com.anhnht.warehouse.service.modules.vessel.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleRepository repository;

    @Override
    public List<Schedule> findAll() {
        return repository.findAll();
    }

    @Override
    public Schedule findById(Integer id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Schedule not found: " + id));
    }

    @Override
    @Transactional
    public Schedule create(ScheduleRequest request) {
        Schedule entity = new Schedule();
        apply(entity, request);
        return repository.save(entity);
    }

    @Override
    @Transactional
    public Schedule update(Integer id, ScheduleRequest request) {
        Schedule entity = findById(id);
        apply(entity, request);
        entity.setUpdatedAt(LocalDateTime.now());
        return repository.save(entity);
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        repository.delete(findById(id));
    }

    // ---- Private helpers ----

    private void apply(Schedule entity, ScheduleRequest request) {
        if (StringUtils.hasText(request.getCompanyName())) entity.setCompanyName(request.getCompanyName());
        if (StringUtils.hasText(request.getShipName()))    entity.setShipName(request.getShipName());
        if (StringUtils.hasText(request.getType()))        entity.setType(request.getType());
        if (StringUtils.hasText(request.getLocation()))    entity.setLocation(request.getLocation());
        if (StringUtils.hasText(request.getStatus()))      entity.setStatus(request.getStatus());
        if (request.getTimeStart()  != null) entity.setTimeStart(request.getTimeStart());
        if (request.getTimeEnd()    != null) entity.setTimeEnd(request.getTimeEnd());
        if (request.getContainers() != null) entity.setContainers(request.getContainers());
        if (StringUtils.hasText(request.getShipType())) entity.setShipType(request.getShipType());
    }
}

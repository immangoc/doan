package com.anhnht.warehouse.service.modules.user.service;

import com.anhnht.warehouse.service.modules.user.entity.SystemLog;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.SystemLogRepository;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemLogService {

    private final SystemLogRepository systemLogRepository;
    private final UserRepository      userRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Integer userId, String action, String description) {
        try {
            SystemLog entry = new SystemLog();
            if (userId != null) {
                userRepository.findById(userId).ifPresent(entry::setUser);
            }
            entry.setAction(action);
            entry.setDescription(description);
            systemLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write system log: action={}, error={}", action, e.getMessage());
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String description) {
        log(null, action, description);
    }

    @Transactional(readOnly = true)
    public Page<SystemLog> findAll(Pageable pageable) {
        return systemLogRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<SystemLog> findByUserId(Integer userId, Pageable pageable) {
        return systemLogRepository.findAllByUserUserId(userId, pageable);
    }
}

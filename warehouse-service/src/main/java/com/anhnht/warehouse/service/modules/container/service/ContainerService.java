package com.anhnht.warehouse.service.modules.container.service;

import com.anhnht.warehouse.service.modules.container.dto.request.ContainerRequest;
import com.anhnht.warehouse.service.modules.container.dto.request.ExportPriorityRequest;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.entity.ContainerStatusHistory;
import com.anhnht.warehouse.service.modules.container.entity.ExportPriority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ContainerService {

    Page<Container> findAll(String keyword, String statusName, Pageable pageable);
    Page<Container> findByCustomer(Integer customerId, Pageable pageable);
    Container findById(String containerId);

    Container create(ContainerRequest request);
    Container update(String containerId, ContainerRequest request);
    void delete(String containerId);

    /** Internal: update container status and record history entry. */
    Container changeStatus(String containerId, String statusName, String description);

    List<ContainerStatusHistory> getStatusHistory(String containerId);

    ExportPriority setExportPriority(String containerId, ExportPriorityRequest request);
    ExportPriority getExportPriority(String containerId);

    /** Marks a DAMAGED container as AVAILABLE (repaired). */
    Container markRepaired(String containerId);
}

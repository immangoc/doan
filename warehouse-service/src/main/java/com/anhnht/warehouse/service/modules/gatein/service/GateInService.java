package com.anhnht.warehouse.service.modules.gatein.service;

import com.anhnht.warehouse.service.modules.gatein.dto.request.ContainerPositionRequest;
import com.anhnht.warehouse.service.modules.gatein.dto.request.GateInRequest;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.entity.GateInReceipt;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface GateInService {

    /** Process gate-in: creates receipt, updates container status, assigns yard storage. */
    GateInReceipt processGateIn(Integer operatorId, GateInRequest request);

    Page<GateInReceipt> findAll(Pageable pageable);

    GateInReceipt findById(Integer gateInId);

    /** Assign container to a specific slot and tier (manual placement). */
    ContainerPosition assignPosition(String containerId, ContainerPositionRequest request);

    ContainerPosition getPosition(String containerId);

    List<YardStorage> getStorageHistory(String containerId);
}

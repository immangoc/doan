package com.anhnht.warehouse.service.modules.gatein.service;

import com.anhnht.warehouse.service.modules.gatein.dto.request.ContainerPositionRequest;
import com.anhnht.warehouse.service.modules.gatein.dto.response.PlacementTaskResponse;

import java.util.List;

public interface PlacementTaskService {
    PlacementTaskResponse createPlacementTask(String containerId, ContainerPositionRequest request);
    List<PlacementTaskResponse> getPendingTasks();
    void confirmPlacementTask(Integer taskId);
}

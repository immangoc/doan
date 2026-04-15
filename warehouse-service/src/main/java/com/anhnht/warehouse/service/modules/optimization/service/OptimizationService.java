package com.anhnht.warehouse.service.modules.optimization.service;

import com.anhnht.warehouse.service.modules.optimization.dto.request.PlacementRequest;
import com.anhnht.warehouse.service.modules.optimization.dto.response.PlacementRecommendation;

public interface OptimizationService {

    /**
     * Returns Top-5 slot recommendations for placing a container.
     *
     * If request.containerId is set, cargo type and weight are resolved from DB.
     * Otherwise request.cargoTypeName and request.grossWeight are used directly.
     */
    PlacementRecommendation recommend(PlacementRequest request);
}

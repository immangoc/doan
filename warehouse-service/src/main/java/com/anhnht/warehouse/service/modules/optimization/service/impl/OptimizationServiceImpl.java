package com.anhnht.warehouse.service.modules.optimization.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.optimization.algorithm.StackingAlgorithm;
import com.anhnht.warehouse.service.modules.optimization.dto.request.PlacementRequest;
import com.anhnht.warehouse.service.modules.optimization.dto.response.PlacementRecommendation;
import com.anhnht.warehouse.service.modules.optimization.service.OptimizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OptimizationServiceImpl implements OptimizationService {

    private final StackingAlgorithm  algorithm;
    private final ContainerService   containerService;

    @Override
    public PlacementRecommendation recommend(PlacementRequest request) {
        String     containerId   = null;
        String     cargoTypeName;
        BigDecimal grossWeight;
        String     containerType = request.getContainerType();

        if (StringUtils.hasText(request.getContainerId())) {
            // Resolve from registered container
            Container container = containerService.findById(request.getContainerId());
            containerId   = container.getContainerId();
            cargoTypeName = container.getCargoType() != null
                    ? container.getCargoType().getCargoTypeName()
                    : null;
            grossWeight   = container.getGrossWeight();
            if (containerType == null && container.getContainerType() != null) {
                containerType = container.getContainerType().getContainerTypeName();
            }

            if (cargoTypeName == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Container has no cargo type assigned: " + containerId);
            }
        } else {
            // Ad-hoc request
            if (!StringUtils.hasText(request.getCargoTypeName())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "Either containerId or cargoTypeName must be provided");
            }
            cargoTypeName = request.getCargoTypeName();
            grossWeight   = request.getGrossWeight();
        }

        return algorithm.recommend(containerId, cargoTypeName, grossWeight, containerType);
    }
}

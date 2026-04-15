package com.anhnht.warehouse.service.modules.vessel.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.vessel.dto.request.VesselRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.Vessel;
import com.anhnht.warehouse.service.modules.vessel.repository.VesselRepository;
import com.anhnht.warehouse.service.modules.vessel.service.VesselService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VesselServiceImpl implements VesselService {

    private final VesselRepository vesselRepository;

    @Override
    public Page<Vessel> findAll(String keyword, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();
        return vesselRepository.search(kw, pageable);
    }

    @Override
    public Vessel findById(Integer vesselId) {
        return vesselRepository.findById(vesselId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Vessel not found: " + vesselId));
    }

    @Override
    @Transactional
    public Vessel create(VesselRequest request) {
        Vessel vessel = new Vessel();
        vessel.setVesselName(request.getVesselName());
        vessel.setShippingLine(request.getShippingLine());
        return vesselRepository.save(vessel);
    }

    @Override
    @Transactional
    public Vessel update(Integer vesselId, VesselRequest request) {
        Vessel vessel = findById(vesselId);
        vessel.setVesselName(request.getVesselName());
        vessel.setShippingLine(request.getShippingLine());
        return vesselRepository.save(vessel);
    }

    @Override
    @Transactional
    public void delete(Integer vesselId) {
        vesselRepository.delete(findById(vesselId));
    }
}

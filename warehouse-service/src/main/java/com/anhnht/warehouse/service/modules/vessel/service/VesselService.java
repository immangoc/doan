package com.anhnht.warehouse.service.modules.vessel.service;

import com.anhnht.warehouse.service.modules.vessel.dto.request.VesselRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.Vessel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface VesselService {

    Page<Vessel> findAll(String keyword, Pageable pageable);
    Vessel findById(Integer vesselId);
    Vessel create(VesselRequest request);
    Vessel update(Integer vesselId, VesselRequest request);
    void delete(Integer vesselId);
}

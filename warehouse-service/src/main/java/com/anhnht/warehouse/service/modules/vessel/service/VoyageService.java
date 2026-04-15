package com.anhnht.warehouse.service.modules.vessel.service;

import com.anhnht.warehouse.service.modules.vessel.dto.request.ManifestRequest;
import com.anhnht.warehouse.service.modules.vessel.dto.request.VoyageRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.Manifest;
import com.anhnht.warehouse.service.modules.vessel.entity.Voyage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VoyageService {

    // Voyages
    Page<Voyage> findAll(Pageable pageable);
    List<Voyage> findByVesselId(Integer vesselId);
    List<Voyage> findUpcoming();
    Voyage findById(Integer voyageId);
    Voyage create(VoyageRequest request);
    Voyage update(Integer voyageId, VoyageRequest request);
    void delete(Integer voyageId);

    // Manifests (nested under voyage)
    List<Manifest> getManifests(Integer voyageId);
    Manifest getManifestById(Integer manifestId);
    Manifest createManifest(Integer voyageId, ManifestRequest request);
    Manifest updateManifest(Integer manifestId, ManifestRequest request);
    void deleteManifest(Integer manifestId);
}

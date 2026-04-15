package com.anhnht.warehouse.service.modules.vessel.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.vessel.dto.request.ManifestRequest;
import com.anhnht.warehouse.service.modules.vessel.dto.request.VoyageRequest;
import com.anhnht.warehouse.service.modules.vessel.entity.Manifest;
import com.anhnht.warehouse.service.modules.vessel.entity.Vessel;
import com.anhnht.warehouse.service.modules.vessel.entity.Voyage;
import com.anhnht.warehouse.service.modules.vessel.repository.ManifestRepository;
import com.anhnht.warehouse.service.modules.vessel.repository.VesselRepository;
import com.anhnht.warehouse.service.modules.vessel.repository.VoyageRepository;
import com.anhnht.warehouse.service.modules.vessel.service.VoyageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoyageServiceImpl implements VoyageService {

    private final VoyageRepository  voyageRepository;
    private final VesselRepository  vesselRepository;
    private final ManifestRepository manifestRepository;

    // ---- Voyages ----

    @Override
    public Page<Voyage> findAll(Pageable pageable) {
        return voyageRepository.findAll(pageable);
    }

    @Override
    public List<Voyage> findByVesselId(Integer vesselId) {
        return voyageRepository.findAllByVesselVesselId(vesselId);
    }

    @Override
    public List<Voyage> findUpcoming() {
        return voyageRepository.findUpcomingVoyages();
    }

    @Override
    public Voyage findById(Integer voyageId) {
        return voyageRepository.findById(voyageId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Voyage not found: " + voyageId));
    }

    @Override
    @Transactional
    public Voyage create(VoyageRequest request) {
        Vessel vessel = vesselRepository.findById(request.getVesselId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Vessel not found: " + request.getVesselId()));

        Voyage voyage = new Voyage();
        voyage.setVessel(vessel);
        applyVoyageFields(voyage, request);
        return voyageRepository.save(voyage);
    }

    @Override
    @Transactional
    public Voyage update(Integer voyageId, VoyageRequest request) {
        Voyage voyage = findById(voyageId);
        if (request.getVesselId() != null && !request.getVesselId().equals(voyage.getVessel().getVesselId())) {
            Vessel vessel = vesselRepository.findById(request.getVesselId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Vessel not found: " + request.getVesselId()));
            voyage.setVessel(vessel);
        }
        applyVoyageFields(voyage, request);
        return voyageRepository.save(voyage);
    }

    @Override
    @Transactional
    public void delete(Integer voyageId) {
        voyageRepository.delete(findById(voyageId));
    }

    // ---- Manifests ----

    @Override
    public List<Manifest> getManifests(Integer voyageId) {
        return manifestRepository.findAllByVoyageVoyageId(voyageId);
    }

    @Override
    public Manifest getManifestById(Integer manifestId) {
        return manifestRepository.findById(manifestId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Manifest not found: " + manifestId));
    }

    @Override
    @Transactional
    public Manifest createManifest(Integer voyageId, ManifestRequest request) {
        Voyage voyage = findById(voyageId);
        Manifest manifest = new Manifest();
        manifest.setVoyage(voyage);
        manifest.setNote(request.getNote());
        return manifestRepository.save(manifest);
    }

    @Override
    @Transactional
    public Manifest updateManifest(Integer manifestId, ManifestRequest request) {
        Manifest manifest = getManifestById(manifestId);
        manifest.setNote(request.getNote());
        return manifestRepository.save(manifest);
    }

    @Override
    @Transactional
    public void deleteManifest(Integer manifestId) {
        manifestRepository.delete(getManifestById(manifestId));
    }

    // ---- Private helpers ----

    private void applyVoyageFields(Voyage voyage, VoyageRequest request) {
        if (request.getVoyageNo()             != null) voyage.setVoyageNo(request.getVoyageNo());
        if (request.getPortOfLoading()        != null) voyage.setPortOfLoading(request.getPortOfLoading());
        if (request.getPortOfDischarge()      != null) voyage.setPortOfDischarge(request.getPortOfDischarge());
        if (request.getEstimatedTimeArrival() != null) voyage.setEstimatedTimeArrival(request.getEstimatedTimeArrival());
        if (request.getActualTimeArrival()    != null) voyage.setActualTimeArrival(request.getActualTimeArrival());
    }
}

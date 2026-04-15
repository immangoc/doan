package com.anhnht.warehouse.service.modules.container.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.container.dto.request.ContainerRequest;
import com.anhnht.warehouse.service.modules.container.dto.request.ExportPriorityRequest;
import com.anhnht.warehouse.service.modules.container.entity.*;
import com.anhnht.warehouse.service.modules.container.repository.*;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.vessel.entity.Manifest;
import com.anhnht.warehouse.service.modules.vessel.repository.ManifestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContainerServiceImpl implements ContainerService {

    private final ContainerRepository              containerRepository;
    private final ContainerStatusRepository        statusRepository;
    private final ContainerStatusHistoryRepository historyRepository;
    private final ExportPriorityRepository         priorityRepository;
    private final ManifestRepository               manifestRepository;
    private final ContainerTypeRepository          containerTypeRepository;
    private final CargoTypeRepository              cargoTypeRepository;
    private final CargoAttributeRepository         cargoAttributeRepository;

    @Override
    public Page<Container> findAll(String keyword, String statusName, Pageable pageable) {
        String kw = (keyword   == null || keyword.isBlank())   ? "" : keyword.trim();
        String sn = (statusName == null || statusName.isBlank()) ? "" : statusName.trim();
        return containerRepository.search(kw, sn, pageable);
    }

    @Override
    public Page<Container> findByCustomer(Integer customerId, Pageable pageable) {
        return containerRepository.findByCustomerUserId(customerId, pageable);
    }

    @Override
    public Container findById(String containerId) {
        return containerRepository.findByIdWithDetails(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Container not found: " + containerId));
    }

    @Override
    @Transactional
    public Container create(ContainerRequest request) {
        if (containerRepository.existsById(request.getContainerId())) {
            throw new BusinessException(ErrorCode.CONTAINER_ALREADY_EXISTS,
                    "Container already exists: " + request.getContainerId());
        }

        Container container = new Container();
        container.setContainerId(request.getContainerId());
        container.setSealNumber(request.getSealNumber());
        container.setGrossWeight(request.getGrossWeight());
        container.setNote(request.getNote());

        applyLookups(container, request);

        // Default status = AVAILABLE
        ContainerStatus available = resolveStatus("AVAILABLE");
        container.setStatus(available);

        Container saved = containerRepository.save(container);
        recordHistory(saved, available, "Container registered");
        return saved;
    }

    @Override
    @Transactional
    public Container update(String containerId, ContainerRequest request) {
        Container container = findById(containerId);
        container.setSealNumber(request.getSealNumber());
        container.setGrossWeight(request.getGrossWeight());
        container.setNote(request.getNote());
        applyLookups(container, request);
        return containerRepository.save(container);
    }

    @Override
    @Transactional
    public void delete(String containerId) {
        Container container = findById(containerId);
        containerRepository.delete(container);
    }

    @Override
    @Transactional
    public Container changeStatus(String containerId, String statusName, String description) {
        Container container = findById(containerId);
        ContainerStatus newStatus = resolveStatus(statusName);
        container.setStatus(newStatus);
        Container saved = containerRepository.save(container);
        recordHistory(saved, newStatus, description);
        return saved;
    }

    @Override
    @Transactional
    public Container updateDamageDetails(String containerId, com.anhnht.warehouse.service.modules.container.dto.request.DamageDetailsRequest request) {
        Container container = findById(containerId);
        if (request.getRepairStatus() != null) {
            container.setRepairStatus(request.getRepairStatus());
        }
        if (request.getRepairDate() != null) {
            container.setRepairDate(request.getRepairDate());
        }
        if (request.getCompensationCost() != null) {
            container.setCompensationCost(request.getCompensationCost());
        }
        return containerRepository.save(container);
    }

    @Override
    public List<ContainerStatusHistory> getStatusHistory(String containerId) {
        findById(containerId); // validate existence
        return historyRepository.findByContainerIdOrdered(containerId);
    }

    @Override
    @Transactional
    public ExportPriority setExportPriority(String containerId, ExportPriorityRequest request) {
        Container container = findById(containerId);
        ExportPriority priority = priorityRepository.findByContainerContainerId(containerId)
                .orElseGet(ExportPriority::new);
        priority.setContainer(container);
        priority.setPriorityLevel(request.getPriorityLevel());
        priority.setNote(request.getNote());
        return priorityRepository.save(priority);
    }

    @Override
    public ExportPriority getExportPriority(String containerId) {
        return priorityRepository.findByContainerContainerId(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "No export priority set for container: " + containerId));
    }

    // ----------------------------------------------------------------

    private void applyLookups(Container container, ContainerRequest request) {
        if (request.getManifestId() != null) {
            Manifest manifest = manifestRepository.findById(request.getManifestId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                            "Manifest not found: " + request.getManifestId()));
            container.setManifest(manifest);
        }
        if (request.getContainerTypeId() != null) {
            container.setContainerType(containerTypeRepository.findById(request.getContainerTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                            "Container type not found: " + request.getContainerTypeId())));
        }
        if (request.getCargoTypeId() != null) {
            container.setCargoType(cargoTypeRepository.findById(request.getCargoTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                            "Cargo type not found: " + request.getCargoTypeId())));
        }
        if (request.getAttributeId() != null) {
            container.setAttribute(cargoAttributeRepository.findById(request.getAttributeId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                            "Cargo attribute not found: " + request.getAttributeId())));
        }
    }

    private ContainerStatus resolveStatus(String name) {
        return statusRepository.findByStatusNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Container status not found: " + name));
    }

    private void recordHistory(Container container, ContainerStatus status, String description) {
        ContainerStatusHistory h = new ContainerStatusHistory();
        h.setContainer(container);
        h.setStatus(status);
        h.setDescription(description);
        historyRepository.save(h);
    }
}

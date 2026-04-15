package com.anhnht.warehouse.service.modules.container.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.PageableUtils;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.container.dto.request.ContainerRequest;
import com.anhnht.warehouse.service.modules.container.dto.request.ExportPriorityRequest;
import com.anhnht.warehouse.service.modules.container.dto.request.ExpectedExitDateRequest;
import com.anhnht.warehouse.service.modules.container.dto.response.ContainerResponse;
import com.anhnht.warehouse.service.modules.container.dto.response.ContainerStatusHistoryResponse;
import com.anhnht.warehouse.service.modules.container.dto.response.ExportPriorityResponse;
import com.anhnht.warehouse.service.modules.container.mapper.ContainerMapper;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.container.service.DamageWorkflowService;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/containers")
@RequiredArgsConstructor
public class ContainerController {

    private final ContainerService             containerService;
    private final ContainerMapper              containerMapper;
    private final ContainerPositionRepository  positionRepository;
    private final DamageWorkflowService        damageWorkflowService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<ContainerResponse>>> getContainers(
            @RequestParam(required = false)               String keyword,
            @RequestParam(required = false)               String statusName,
            @RequestParam(defaultValue = "0")             int page,
            @RequestParam(defaultValue = "20")            int size,
            @RequestParam(defaultValue = "containerId")   String sortBy,
            @RequestParam(defaultValue = "asc")           String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        Page<ContainerResponse> responsePage = containerService
                .findAll(keyword, statusName, pageable)
                .map(containerMapper::toContainerResponse);

        // Batch-fetch positions and enrich responses (single extra query, no N+1)
        List<String> ids = responsePage.getContent().stream()
                .map(ContainerResponse::getContainerId)
                .collect(Collectors.toList());

        if (!ids.isEmpty()) {
            Map<String, ContainerPosition> posMap = positionRepository
                    .findAllByContainerIds(ids).stream()
                    .collect(Collectors.toMap(
                            cp -> cp.getContainer().getContainerId(),
                            cp -> cp));

            responsePage.getContent().forEach(r -> {
                ContainerPosition cp = posMap.get(r.getContainerId());
                if (cp != null && cp.getSlot() != null) {
                    var block = cp.getSlot().getBlock();
                    var zone  = block != null ? block.getZone() : null;
                    var yard  = zone  != null ? zone.getYard()  : null;
                    r.setRowNo(cp.getSlot().getRowNo());
                    r.setBayNo(cp.getSlot().getBayNo());
                    r.setTier(cp.getTier());
                    if (block != null) r.setBlockName(block.getBlockName());
                    if (zone  != null) r.setZoneName(zone.getZoneName());
                    if (yard  != null) {
                        r.setYardName(yard.getYardName());
                        if (yard.getYardType() != null)
                            r.setYardType(yard.getYardType().getYardTypeName());
                    }
                }
            });
        }

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(responsePage)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ContainerResponse>> getContainer(@PathVariable String id) {
        ContainerResponse r = containerMapper.toContainerResponse(containerService.findById(id));
        positionRepository.findByContainerContainerId(id).ifPresent(cp -> {
            if (cp.getSlot() != null) {
                var block = cp.getSlot().getBlock();
                var zone  = block != null ? block.getZone() : null;
                var yard  = zone  != null ? zone.getYard()  : null;
                r.setRowNo(cp.getSlot().getRowNo());
                r.setBayNo(cp.getSlot().getBayNo());
                r.setTier(cp.getTier());
                if (block != null) r.setBlockName(block.getBlockName());
                if (zone  != null) r.setZoneName(zone.getZoneName());
                if (yard  != null) {
                    r.setYardName(yard.getYardName());
                    if (yard.getYardType() != null)
                        r.setYardType(yard.getYardType().getYardTypeName());
                }
            }
        });
        return ResponseEntity.ok(ApiResponse.success(r));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','CUSTOMER')")
    public ResponseEntity<ApiResponse<ContainerResponse>> createContainer(
            @Valid @RequestBody ContainerRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                containerMapper.toContainerResponse(containerService.create(request))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ContainerResponse>> updateContainer(
            @PathVariable String id,
            @Valid @RequestBody ContainerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(containerService.update(id, request))));
    }

    @GetMapping("/{id}/status-history")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<ContainerStatusHistoryResponse>>> getStatusHistory(
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toHistoryResponses(containerService.getStatusHistory(id))));
    }

    @PostMapping("/{id}/damage")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ContainerResponse>> reportDamage(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(
                        containerService.changeStatus(id, "DAMAGED", "Báo hỏng qua giao diện 3D/2D"))));
    }

    /**
     * POST /admin/containers/{id}/move-to-damaged-yard
     * Auto-relocate a container into the "damaged" yard area (Kho hỏng) at tier 1.
     * Also marks repairStatus = REPAIRING and updates current yard storage record.
     */
    @PostMapping("/{id}/move-to-damaged-yard")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ContainerResponse>> moveToDamagedYard(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(damageWorkflowService.moveToDamagedYard(id))));
    }

    /**
     * PUT /admin/containers/{id}/expected-exit-date
     * Updates the expected exit date (planned export date) for billing/alerts.
     */
    @PutMapping("/{id}/expected-exit-date")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<Void>> setExpectedExitDate(
            @PathVariable String id,
            @Valid @RequestBody ExpectedExitDateRequest request) {
        damageWorkflowService.setExpectedExitDate(id, request.getExpectedExitDate());
        return ResponseEntity.ok(ApiResponse.success(null));
    }


    @PutMapping("/{id}/damage-details")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ContainerResponse>> updateDamageDetails(
            @PathVariable String id,
            @Valid @RequestBody com.anhnht.warehouse.service.modules.container.dto.request.DamageDetailsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(containerService.updateDamageDetails(id, request))));
    }

    @PutMapping("/{id}/export-priority")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ExportPriorityResponse>> setExportPriority(
            @PathVariable String id,
            @Valid @RequestBody ExportPriorityRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toExportPriorityResponse(containerService.setExportPriority(id, request))));
    }

    @GetMapping("/{id}/export-priority")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<ExportPriorityResponse>> getExportPriority(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toExportPriorityResponse(containerService.getExportPriority(id))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteContainer(@PathVariable String id) {
        containerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<ContainerResponse>>> getMyContainers(
            @RequestParam(defaultValue = "0")           int page,
            @RequestParam(defaultValue = "20")          int size,
            @RequestParam(defaultValue = "containerId") String sortBy,
            @RequestParam(defaultValue = "asc")         String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        Integer customerId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(containerService.findByCustomer(customerId, pageable)
                        .map(containerMapper::toContainerResponse))));
    }
}

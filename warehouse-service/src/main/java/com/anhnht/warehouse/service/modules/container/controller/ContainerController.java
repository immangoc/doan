package com.anhnht.warehouse.service.modules.container.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.PageableUtils;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.booking.repository.OrderRepository;
import com.anhnht.warehouse.service.modules.container.dto.request.ContainerRequest;
import com.anhnht.warehouse.service.modules.container.dto.request.ExportPriorityRequest;
import com.anhnht.warehouse.service.modules.container.dto.response.ContainerResponse;
import com.anhnht.warehouse.service.modules.container.dto.response.ContainerStatusHistoryResponse;
import com.anhnht.warehouse.service.modules.container.dto.response.ExportPriorityResponse;
import com.anhnht.warehouse.service.modules.container.mapper.ContainerMapper;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.container.service.DamageWorkflowService;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.gateout.entity.GateOutReceipt;
import com.anhnht.warehouse.service.modules.gateout.repository.GateOutReceiptRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Container", description = "Quản lý container trong kho")
@RestController
@RequestMapping("/admin/containers")
@RequiredArgsConstructor
public class ContainerController {

    private static final List<String> TERMINAL_STATUSES = List.of("CANCELLED", "REJECTED", "EXPORTED", "GATE_OUT");

    private final ContainerService containerService;
    private final ContainerMapper containerMapper;
    private final ContainerPositionRepository positionRepository;
    private final GateOutReceiptRepository gateOutReceiptRepository;
    private final DamageWorkflowService damageWorkflowService;
    private final OrderRepository orderRepository;
    private final YardStorageRepository yardStorageRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<PageResponse<ContainerResponse>>> getContainers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String statusName,
            @RequestParam(required = false) String yardName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "containerId") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        Page<ContainerResponse> responsePage = containerService
                .findAll(keyword, statusName, yardName, pageable)
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

            Map<String, GateOutReceipt> gateOutMap = gateOutReceiptRepository
                    .findAllByContainerIds(ids).stream()
                    .collect(Collectors.toMap(
                            g -> g.getContainer().getContainerId(),
                            g -> g,
                            (a, b) -> a));

            Map<String, LocalDate> expectedExitMap = yardStorageRepository
                    .findExpectedExitDates(ids).stream()
                    .collect(Collectors.toMap(
                            row -> (String) row[0],
                            row -> (LocalDate) row[1]));

            Map<String, Integer> activeOrderMap = orderRepository
                    .findActiveOrderIdsForContainers(ids, TERMINAL_STATUSES).stream()
                    .collect(Collectors.toMap(
                            row -> (String) row[0],
                            row -> (Integer) row[1]));

            responsePage.getContent().forEach(r -> {
                ContainerPosition cp = posMap.get(r.getContainerId());
                if (cp != null && cp.getSlot() != null) {
                    var block = cp.getSlot().getBlock();
                    var zone = block != null ? block.getZone() : null;
                    var yard = zone != null ? zone.getYard() : null;
                    r.setRowNo(cp.getSlot().getRowNo());
                    r.setBayNo(cp.getSlot().getBayNo());
                    r.setTier(cp.getTier());
                    if (block != null)
                        r.setBlockName(block.getBlockName());
                    if (zone != null)
                        r.setZoneName(zone.getZoneName());
                    if (yard != null) {
                        r.setYardName(yard.getYardName());
                        if (yard.getYardType() != null)
                            r.setYardType(yard.getYardType().getYardTypeName());
                    }
                }
                r.setExpectedExitDate(expectedExitMap.get(r.getContainerId()));
                r.setActiveOrderId(activeOrderMap.get(r.getContainerId()));
                r.setInActiveOrder(r.getActiveOrderId() != null);
                // For gated-out containers, fill position from snapshot on GateOutReceipt
                GateOutReceipt g = gateOutMap.get(r.getContainerId());
                if (g != null) {
                    r.setGateOutTime(g.getGateOutTime());
                    if (r.getYardName() == null)
                        r.setYardName(g.getLastYardName());
                    if (r.getZoneName() == null)
                        r.setZoneName(g.getLastZoneName());
                    if (r.getBlockName() == null)
                        r.setBlockName(g.getLastBlockName());
                    if (r.getRowNo() == null)
                        r.setRowNo(g.getLastRowNo());
                    if (r.getBayNo() == null)
                        r.setBayNo(g.getLastBayNo());
                    if (r.getTier() == null)
                        r.setTier(g.getLastTier());
                }
            });
        }

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(responsePage)));
    }

    /**
     * Container IDs whose storageEndDate has passed and are still in yard.
     * Used by the 3D yard view to render a red blinking outline on overdue containers.
     */
    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<List<String>>> getOverdueContainerIds() {
        LocalDate today = LocalDate.now();
        List<String> ids = yardStorageRepository.findWithExitOnOrBefore(today.minusDays(1)).stream()
                .filter(s -> {
                    String status = s.getContainer().getStatus() != null
                            ? s.getContainer().getStatus().getStatusName() : "";
                    return !"GATE_OUT".equalsIgnoreCase(status)
                            && !"EXPORTED".equalsIgnoreCase(status);
                })
                .map(s -> s.getContainer().getContainerId())
                .distinct()
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(ids));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<ContainerResponse>> getContainer(@PathVariable String id) {
        ContainerResponse r = containerMapper.toContainerResponse(containerService.findById(id));
        positionRepository.findByContainerContainerId(id).ifPresent(cp -> {
            if (cp.getSlot() != null) {
                var block = cp.getSlot().getBlock();
                var zone = block != null ? block.getZone() : null;
                var yard = zone != null ? zone.getYard() : null;
                r.setRowNo(cp.getSlot().getRowNo());
                r.setBayNo(cp.getSlot().getBayNo());
                r.setTier(cp.getTier());
                if (block != null)
                    r.setBlockName(block.getBlockName());
                if (zone != null)
                    r.setZoneName(zone.getZoneName());
                if (yard != null) {
                    r.setYardName(yard.getYardName());
                    if (yard.getYardType() != null)
                        r.setYardType(yard.getYardType().getYardTypeName());
                }
            }
        });
        gateOutReceiptRepository.findByContainerContainerId(id).ifPresent(g -> {
            r.setGateOutTime(g.getGateOutTime());
            if (r.getYardName() == null)
                r.setYardName(g.getLastYardName());
            if (r.getZoneName() == null)
                r.setZoneName(g.getLastZoneName());
            if (r.getBlockName() == null)
                r.setBlockName(g.getLastBlockName());
            if (r.getRowNo() == null)
                r.setRowNo(g.getLastRowNo());
            if (r.getBayNo() == null)
                r.setBayNo(g.getLastBayNo());
            if (r.getTier() == null)
                r.setTier(g.getLastTier());
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
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<ContainerResponse>> updateContainer(
            @PathVariable String id,
            @Valid @RequestBody ContainerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(containerService.update(id, request))));
    }

    @GetMapping("/{id}/status-history")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<List<ContainerStatusHistoryResponse>>> getStatusHistory(
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toHistoryResponses(containerService.getStatusHistory(id))));
    }

    @PutMapping("/{id}/export-priority")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<ExportPriorityResponse>> setExportPriority(
            @PathVariable String id,
            @Valid @RequestBody ExportPriorityRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toExportPriorityResponse(containerService.setExportPriority(id, request))));
    }

    @GetMapping("/{id}/export-priority")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<ExportPriorityResponse>> getExportPriority(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toExportPriorityResponse(containerService.getExportPriority(id))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<Void>> deleteContainer(@PathVariable String id) {
        containerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * PUT /admin/containers/{id}/repair
     * Marks a DAMAGED container as AVAILABLE (repaired).
     */
    @PutMapping("/{id}/repair")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<ContainerResponse>> markRepaired(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(containerService.markRepaired(id))));
    }

    /**
     * PUT /admin/containers/{id}/damage
     * Reports a container as damaged: changes status to DAMAGED and
     * relocates it to a free slot in the damaged yard.
     */
    @PutMapping("/{id}/damage")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<ContainerResponse>> reportDamage(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(damageWorkflowService.moveToDamagedYard(id))));
    }

    /**
     * PUT /admin/containers/{id}/damage-details
     * Updates damage-tracking fields (repairStatus, repairDate, compensationCost)
     * on a DAMAGED container.
     */
    @PutMapping("/{id}/damage-details")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<ContainerResponse>> updateDamageDetails(
            @PathVariable String id,
            @Valid @RequestBody com.anhnht.warehouse.service.modules.container.dto.request.DamageDetailsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                containerMapper.toContainerResponse(containerService.updateDamageDetails(id, request))));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<ContainerResponse>>> getMyContainers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "containerId") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        Integer customerId = SecurityUtils.getCurrentUserId();
        Page<ContainerResponse> responsePage = containerService.findByCustomer(customerId, pageable)
                .map(containerMapper::toContainerResponse);

        // Batch-flag containers that are currently in an active order
        List<String> ids = responsePage.getContent().stream()
                .map(ContainerResponse::getContainerId)
                .collect(Collectors.toList());
        if (!ids.isEmpty()) {
            Set<String> inActiveOrder = new HashSet<>(
                    orderRepository.findContainerIdsInActiveOrders(ids, TERMINAL_STATUSES));
            responsePage.getContent().forEach(r -> r.setInActiveOrder(inActiveOrder.contains(r.getContainerId())));
        }

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(responsePage)));
    }

    /**
     * GET /admin/containers/my/eligible
     * Returns containers owned by the current user that are not attached to any
     * active order.
     * Optional param orderId: if provided, containers already in that order are
     * also included
     * (used when editing an existing order).
     */
    @GetMapping("/my/eligible")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<ContainerResponse>>> getEligibleContainers(
            @RequestParam(required = false) Integer orderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(defaultValue = "containerId") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = PageableUtils.of(page, size, sortBy, direction);
        Integer customerId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(containerService.findEligibleByCustomer(customerId, orderId, pageable)
                        .map(containerMapper::toContainerResponse))));
    }
}

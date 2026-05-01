package com.anhnht.warehouse.service.modules.container.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.booking.repository.OrderRepository;
import com.anhnht.warehouse.service.modules.container.dto.request.ContainerRequest;
import com.anhnht.warehouse.service.modules.container.dto.request.ExportPriorityRequest;
import com.anhnht.warehouse.service.modules.container.entity.*;
import com.anhnht.warehouse.service.modules.container.repository.*;
import com.anhnht.warehouse.service.modules.container.service.ContainerService;
import com.anhnht.warehouse.service.modules.alert.service.NotificationService;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.vessel.entity.Manifest;
import com.anhnht.warehouse.service.modules.vessel.repository.ManifestRepository;
import com.anhnht.warehouse.service.modules.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContainerServiceImpl implements ContainerService {

    private static final List<String> TERMINAL_STATUSES = List.of("CANCELLED", "REJECTED", "EXPORTED");

    private final ContainerRepository containerRepository;
    private final ContainerStatusRepository statusRepository;
    private final ContainerStatusHistoryRepository historyRepository;
    private final ExportPriorityRepository priorityRepository;
    private final ManifestRepository manifestRepository;
    private final ContainerTypeRepository containerTypeRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final CargoAttributeRepository cargoAttributeRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ContainerPositionRepository containerPositionRepository;
    private final YardStorageRepository yardStorageRepository;
    private final WalletService walletService;
    private final com.anhnht.warehouse.service.modules.damage.repository.DamageReportRepository damageReportRepository;

    @Override
    public Page<Container> findAll(String keyword, String statusName, String yardName, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();
        String sn = (statusName == null || statusName.isBlank()) ? "" : statusName.trim();
        String yn = (yardName == null || yardName.isBlank()) ? "" : yardName.trim();
        return containerRepository.search(kw, sn, yn, pageable);
    }

    @Override
    public Page<Container> findByCustomer(Integer customerId, Pageable pageable) {
        return containerRepository.findByCustomerUserId(customerId, pageable);
    }

    @Override
    public Page<Container> findEligibleByCustomer(Integer customerId, Integer exceptOrderId, Pageable pageable) {
        int exceptId = (exceptOrderId != null) ? exceptOrderId : -1;
        return containerRepository.findEligibleByOwner(customerId, TERMINAL_STATUSES, exceptId, pageable);
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
        container.setDeclaredValue(request.getDeclaredValue());
        container.setNote(request.getNote());

        // Set owner to the current authenticated user
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId != null) {
            userRepository.findById(currentUserId).ifPresent(container::setOwner);
        }

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
        container.setDeclaredValue(request.getDeclaredValue());
        container.setNote(request.getNote());
        applyLookups(container, request);
        return containerRepository.save(container);
    }

    @Override
    @Transactional
    public void delete(String containerId) {
        Container container = findById(containerId);

        // Prevent deleting a container that is in an active order
        long active = orderRepository.countActiveOrdersForContainer(containerId, TERMINAL_STATUSES);
        if (active > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Không thể xóa container đang trong đơn hàng hoạt động. Hủy đơn hàng trước khi xóa container.");
        }

        // Remove FK references so hard delete succeeds
        historyRepository.deleteByContainerContainerId(containerId);
        containerPositionRepository.deleteByContainerContainerId(containerId);
        priorityRepository.deleteByContainerContainerId(containerId);
        orderRepository.removeContainerFromAllOrders(containerId);

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

        // Notify staff when a container is marked as DAMAGED
        if ("DAMAGED".equalsIgnoreCase(newStatus.getStatusName())) {
            List<Integer> staffIds = userRepository.findUserIdsByRoleNames(List.of("ADMIN", "OPERATOR"));
            if (!staffIds.isEmpty()) {
                notificationService.notify(
                        "Container hỏng: " + containerId,
                        "Container " + containerId + " đã được đánh dấu là DAMAGED. " +
                                (description != null && !description.isBlank() ? "Ghi chú: " + description : ""),
                        staffIds.toArray(new Integer[0]));
            }
        }

        return saved;
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

    @Override
    @Transactional
    public Container markRepaired(String containerId) {
        Container container = findById(containerId);
        if (!"DAMAGED".equalsIgnoreCase(container.getStatus().getStatusName())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Only DAMAGED containers can be marked as repaired. Current: "
                            + container.getStatus().getStatusName());
        }
        ContainerStatus available = resolveStatus("AVAILABLE");
        container.setStatus(available);
        recordHistory(container, available, "Container marked as repaired");
        return containerRepository.save(container);
    }

    @Override
    @Transactional
    public Container updateDamageDetails(String containerId,
            com.anhnht.warehouse.service.modules.container.dto.request.DamageDetailsRequest request) {
        Container container = findById(containerId);
        if (!"DAMAGED".equalsIgnoreCase(container.getStatus().getStatusName())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Only DAMAGED containers can have damage details updated. Current: "
                            + container.getStatus().getStatusName());
        }

        String oldRepairStatus = container.getRepairStatus();

        if (request.getRepairStatus() != null) {
            container.setRepairStatus(request.getRepairStatus());
        }
        if (request.getRepairDate() != null) {
            container.setRepairDate(request.getRepairDate());
            
            // Sync with orders: if new repairDate is later than order's exportDate, update order
            List<com.anhnht.warehouse.service.modules.booking.entity.Order> orders = orderRepository.findOrdersByContainerId(containerId);
            java.time.LocalDate newExportDate = request.getRepairDate().toLocalDate();
            for (com.anhnht.warehouse.service.modules.booking.entity.Order o : orders) {
                if (!TERMINAL_STATUSES.contains(o.getStatus().getStatusName())) {
                    if (o.getExportDate() == null || o.getExportDate().isBefore(newExportDate)) {
                        o.setExportDate(newExportDate);
                        orderRepository.save(o);
                    }
                }
            }
            
            // Sync with YardStorage for 3D warehouse: update storageEndDate
            yardStorageRepository.findActiveByContainerId(containerId).ifPresent(storage -> {
                if (storage.getStorageEndDate() == null || storage.getStorageEndDate().isBefore(newExportDate)) {
                    storage.setStorageEndDate(newExportDate);
                    yardStorageRepository.save(storage);
                }
            });
        }
        if (request.getCompensationCost() != null) {
            container.setCompensationCost(request.getCompensationCost());
        }
        if (request.getRepairCost() != null) {
            container.setRepairCost(request.getRepairCost());
        }

        // Sync with active DamageReport
        damageReportRepository.findFirstByContainerContainerIdAndReportStatusIn(
                containerId, List.of("PENDING", "RELOCATING", "STORED"))
            .ifPresent(report -> {
                if (request.getRepairStatus() != null) report.setRepairStatus(request.getRepairStatus());
                if (request.getRepairDate() != null) report.setRepairDate(request.getRepairDate());
                if (request.getCompensationCost() != null) report.setCompensationCost(request.getCompensationCost());
                if (request.getRepairCost() != null) report.setRepairCost(request.getRepairCost());
                damageReportRepository.save(report);
            });

        return containerRepository.save(container);
    }

    private void recordHistory(Container container, ContainerStatus status, String description) {
        ContainerStatusHistory h = new ContainerStatusHistory();
        h.setContainer(container);
        h.setStatus(status);
        h.setDescription(description);
        historyRepository.save(h);
    }
}

package com.anhnht.warehouse.service.modules.damage.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import com.anhnht.warehouse.service.modules.container.repository.ContainerRepository;
import com.anhnht.warehouse.service.modules.container.repository.ContainerStatusRepository;
import com.anhnht.warehouse.service.modules.damage.dto.DamageReportRequest;
import com.anhnht.warehouse.service.modules.damage.dto.DamageReportResponse;
import com.anhnht.warehouse.service.modules.damage.dto.MoveToDamagedYardRequest;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationMove;
import com.anhnht.warehouse.service.modules.damage.dto.RelocationPlanResponse;
import com.anhnht.warehouse.service.modules.damage.entity.ContainerPositionHistory;
import com.anhnht.warehouse.service.modules.damage.entity.DamageReport;
import com.anhnht.warehouse.service.modules.damage.planner.RelocationPlanner;
import com.anhnht.warehouse.service.modules.damage.repository.ContainerPositionHistoryRepository;
import com.anhnht.warehouse.service.modules.damage.repository.DamageReportRepository;
import com.anhnht.warehouse.service.modules.damage.service.DamageReportService;
import com.anhnht.warehouse.service.modules.gatein.entity.ContainerPosition;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.PlacementTaskRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.optimization.dto.request.PlacementRequest;
import com.anhnht.warehouse.service.modules.optimization.dto.response.PlacementRecommendation;
import com.anhnht.warehouse.service.modules.optimization.dto.response.SlotRecommendation;
import com.anhnht.warehouse.service.modules.optimization.service.OptimizationService;
import com.anhnht.warehouse.service.modules.yard.dto.request.RelocationRequest;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import com.anhnht.warehouse.service.modules.yard.service.StackingRelocationHelper;
import com.anhnht.warehouse.service.modules.yard.service.RelocationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DamageReportServiceImpl implements DamageReportService {

    private static final String STATUS_PENDING    = "PENDING";
    private static final String STATUS_RELOCATING = "RELOCATING";
    private static final String STATUS_STORED     = "STORED";
    private static final String STATUS_CANCELLED  = "CANCELLED";
    private static final String STATUS_RETURNED   = "RETURNED";

    private static final String CTN_DAMAGED_PENDING = "DAMAGED_PENDING";
    private static final String CTN_DAMAGED         = "DAMAGED";
    private static final String CTN_IN_YARD         = "IN_YARD";

    private final DamageReportRepository             reportRepository;
    private final ContainerPositionHistoryRepository historyRepository;
    private final ContainerRepository                containerRepository;
    private final ContainerStatusRepository          statusRepository;
    private final ContainerPositionRepository        positionRepository;
    private final YardStorageRepository              storageRepository;
    private final SlotRepository                     slotRepository;
    private final RelocationService                  relocationService;
    private final RelocationPlanner                  planner;
    private final OptimizationService                optimizationService;
    private final ObjectMapper                       objectMapper;
    private final StackingRelocationHelper           stackingHelper;
    private final com.anhnht.warehouse.service.modules.wallet.service.WalletService walletService;
    private final com.anhnht.warehouse.service.modules.alert.service.NotificationService notificationService;
    private final com.anhnht.warehouse.service.modules.booking.repository.OrderRepository orderRepository;
    private final com.anhnht.warehouse.service.modules.booking.repository.OrderStatusRepository orderStatusRepository;
    private final PlacementTaskRepository placementTaskRepository;

    // ─── Pha 1 ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DamageReportResponse report(DamageReportRequest req) {
        Container container = containerRepository.findById(req.getContainerId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Container không tồn tại: " + req.getContainerId()));

        // Không cho phép báo hỏng nếu đã có report đang xử lý
        reportRepository.findFirstByContainerContainerIdAndReportStatusIn(
                req.getContainerId(), List.of(STATUS_PENDING, STATUS_RELOCATING))
                .ifPresent(existing -> {
                    throw new BusinessException(ErrorCode.BAD_REQUEST,
                            "Container đã có báo hỏng đang xử lý (reportId=" + existing.getReportId() + ")");
                });

        DamageReport report = new DamageReport();
        report.setContainer(container);
        report.setSeverity(req.getSeverity());
        report.setReason(req.getReason());
        report.setPhotoUrls(serialize(req.getPhotoUrls()));
        report.setReportStatus(STATUS_PENDING);
        report = reportRepository.save(report);

        container.setStatus(statusRepository.findByStatusName(CTN_DAMAGED_PENDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND,
                        "Status DAMAGED_PENDING chưa được seed")));
        // Clear container repair info to avoid leaking from past damage reports
        container.setRepairStatus(null);
        container.setRepairDate(null);
        container.setRepairCost(null);
        container.setCompensationCost(null);
        container.setCompensationRefunded(false);
        container.setCompensationRefundedAt(null);
        
        containerRepository.save(container);

        // ★ Cập nhật trạng thái đơn hàng sang DAMAGED ngay khi báo hỏng
        List<com.anhnht.warehouse.service.modules.booking.entity.Order> allOrders = orderRepository.findOrdersByContainerId(req.getContainerId());
        for (com.anhnht.warehouse.service.modules.booking.entity.Order o : allOrders) {
            if (!List.of("CANCELLED", "REJECTED", "EXPORTED").contains(o.getStatus().getStatusName())) {
                orderStatusRepository.findByStatusNameIgnoreCase("DAMAGED").ifPresent(o::setStatus);
                orderRepository.save(o);
            }
        }

        log.info("[Damage] reported container={} reportId={}", container.getContainerId(), report.getReportId());

        return toResponse(report);
    }

    // ─── List pending ───────────────────────────────────────────────────────

    @Override
    public List<DamageReportResponse> listPending() {
        List<DamageReport> pending = reportRepository
                .findByReportStatusOrderByReportedAtDesc(STATUS_PENDING);
        List<DamageReport> relocating = reportRepository
                .findByReportStatusOrderByReportedAtDesc(STATUS_RELOCATING);
        return java.util.stream.Stream.concat(pending.stream(), relocating.stream())
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<DamageReportResponse> listAll() {
        return reportRepository.findAll().stream()
                .filter(r -> !STATUS_CANCELLED.equals(r.getReportStatus())
                          && !STATUS_RETURNED.equals(r.getReportStatus()))
                .sorted((a, b) -> b.getReportedAt().compareTo(a.getReportedAt()))
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<DamageReportResponse> listHistory() {
        return reportRepository.findByReportStatusNotOrderByReportedAtDesc(STATUS_CANCELLED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─── Preview move (dry-run) ─────────────────────────────────────────────

    @Override
    public RelocationPlanResponse previewMove(String containerId) {
        DamageReport report = findActiveReport(containerId);
        RelocationPlanResponse plan = planner.plan(containerId);
        return RelocationPlanResponse.builder()
                .reportId(report.getReportId())
                .targetContainerId(containerId)
                .feasible(plan.isFeasible())
                .infeasibilityReason(plan.getInfeasibilityReason())
                .moves(plan.getMoves())
                .blockerCount(plan.getBlockerCount())
                .build();
    }

    // ─── Pha 2 ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DamageReportResponse moveToDamagedYard(String containerId, MoveToDamagedYardRequest req) {
        DamageReport report = findActiveReport(containerId);

        RelocationPlanResponse plan = planner.plan(containerId);
        if (!plan.isFeasible()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Không thể chuyển vào kho hỏng: " + plan.getInfeasibilityReason());
        }

        report.setReportStatus(STATUS_RELOCATING);
        reportRepository.save(report);

        // ★ Resolve blockers using StackingRelocationHelper (proper gravity handling)
        List<RelocationMove> blockerMoves = stackingHelper.resolveBlockers(
                containerId, "BLOCKER_OF_DAMAGED");

        // Record blocker moves in history
        for (RelocationMove bm : blockerMoves) {
            ContainerPosition blockerPos = positionRepository
                    .findByContainerContainerId(bm.getContainerId()).orElse(null);
            if (blockerPos != null) {
                ContainerPositionHistory hist = new ContainerPositionHistory();
                hist.setContainer(blockerPos.getContainer());
                hist.setFromSlot(slotRepository.findById(bm.getFromSlotId()).orElse(null));
                hist.setFromTier(bm.getFromTier());
                hist.setToSlot(slotRepository.findById(bm.getToSlotId()).orElse(null));
                hist.setToTier(bm.getToTier());
                hist.setReason(bm.getPurpose());
                hist.setDamageReport(report);
                historyRepository.save(hist);
            }
        }

        // Execute the target container move to damaged yard (last move in plan)
        List<RelocationMove> targetMoves = plan.getMoves().stream()
                .filter(m -> "DAMAGE_RELOCATION".equals(m.getPurpose()))
                .toList();
        for (RelocationMove move : targetMoves) {
            executeMove(move, report);
        }

        // Cập nhật trạng thái
        Container container = report.getContainer();
        container.setStatus(statusRepository.findByStatusName(CTN_DAMAGED)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND,
                        "Status DAMAGED chưa được seed")));
        if (container.getRepairStatus() == null) container.setRepairStatus("PENDING");

        // Update order status to DAMAGED
        List<com.anhnht.warehouse.service.modules.booking.entity.Order> allOrders = orderRepository.findOrdersByContainerId(containerId);
        for (com.anhnht.warehouse.service.modules.booking.entity.Order o : allOrders) {
            if (!List.of("CANCELLED", "REJECTED", "EXPORTED").contains(o.getStatus().getStatusName())) {
                orderStatusRepository.findByStatusNameIgnoreCase("DAMAGED").ifPresent(o::setStatus);
                orderRepository.save(o);
            }
        }
        
        // Save container
        containerRepository.save(container);

        // Cập nhật yard_storage record để trỏ về Kho hỏng (không thì trang Kho.tsx vẫn thấy yard cũ)
        positionRepository.findByContainerContainerId(containerId).ifPresent(pos -> {
            var damagedYard = pos.getSlot().getBlock().getZone().getYard();
            storageRepository.findActiveByContainerId(containerId).ifPresent((YardStorage active) -> {
                active.setYard(damagedYard);
                if (req != null && req.getRepairNote() != null && !req.getRepairNote().isBlank()) {
                    active.setNote(req.getRepairNote());
                }
                storageRepository.save(active);
            });
        });

        // Merge all moves for plan JSON
        List<RelocationMove> allMoves = new java.util.ArrayList<>(blockerMoves);
        allMoves.addAll(targetMoves);

        report.setReportStatus(STATUS_STORED);
        report.setCompletedAt(LocalDateTime.now());
        report.setPlanJson(serialize(allMoves));
        reportRepository.save(report);

        log.info("[Damage] container={} moved to damaged yard, {} blocker relocations",
                containerId, blockerMoves.size());

        DamageReportResponse response = toResponse(report);
        if (!blockerMoves.isEmpty()) {
            response.setRelocationMessage(buildRelocationMessage(blockerMoves, "chuyển vào kho hỏng"));
        }
        return response;
    }

    // ─── Cancel ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public DamageReportResponse cancel(String containerId) {
        DamageReport report = findActiveReport(containerId);
        if (!STATUS_PENDING.equals(report.getReportStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Chỉ có thể huỷ báo hỏng khi đang ở trạng thái PENDING");
        }
        report.setReportStatus(STATUS_CANCELLED);
        report.setCompletedAt(LocalDateTime.now());
        reportRepository.save(report);

        Container container = report.getContainer();
        container.setStatus(statusRepository.findByStatusName(CTN_IN_YARD)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Status IN_YARD missing")));
        containerRepository.save(container);

        // ★ Khôi phục trạng thái đơn hàng về STORED khi huỷ báo hỏng
        List<com.anhnht.warehouse.service.modules.booking.entity.Order> allOrders = orderRepository.findOrdersByContainerId(containerId);
        for (com.anhnht.warehouse.service.modules.booking.entity.Order o : allOrders) {
            if ("DAMAGED".equalsIgnoreCase(o.getStatus().getStatusName())) {
                orderStatusRepository.findByStatusNameIgnoreCase("STORED").ifPresent(o::setStatus);
                orderRepository.save(o);
            }
        }

        return toResponse(report);
    }

    // ─── Return to original yard (after repair) using ML ────────────────────

    @Override
    public SlotRecommendation previewReturn(String containerId) {
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Container không tồn tại: " + containerId));
        if (!"REPAIRED".equalsIgnoreCase(container.getRepairStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Container chưa được sửa xong (repair_status phải là REPAIRED)");
        }
        PlacementRequest req = new PlacementRequest();
        req.setContainerId(containerId);
        PlacementRecommendation rec = optimizationService.recommend(req);
        if (rec.getRecommendations() == null || rec.getRecommendations().isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "ML không tìm được slot phù hợp trong kho gốc");
        }
        return rec.getRecommendations().get(0);
    }

    @Override
    @Transactional
    public DamageReportResponse returnToYard(String containerId) {
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CONTAINER_NOT_FOUND,
                        "Container không tồn tại: " + containerId));

        if (!"REPAIRED".equalsIgnoreCase(container.getRepairStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Container chưa được sửa xong (repair_status phải là REPAIRED)");
        }

        // ML chọn slot tối ưu trong yard tương ứng cargo type
        PlacementRequest req = new PlacementRequest();
        req.setContainerId(containerId);
        PlacementRecommendation rec = optimizationService.recommend(req);

        if (rec.getRecommendations() == null || rec.getRecommendations().isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "ML không tìm được slot phù hợp trong kho gốc");
        }
        SlotRecommendation top = rec.getRecommendations().get(0);

        // Lưu vị trí cũ để ghi history
        ContainerPosition before = positionRepository.findByContainerContainerId(containerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST,
                        "Container không có vị trí: " + containerId));
        Integer fromSlotId = before.getSlot().getSlotId();
        Integer fromTier   = before.getTier();

        // ★ Resolve blockers above the container in damaged yard before returning
        List<RelocationMove> blockerMoves = stackingHelper.resolveBlockers(
                containerId, "BLOCKER_OF_RETURN");

        // Record blocker moves in history
        DamageReport report = reportRepository.findFirstByContainerContainerIdAndReportStatusIn(
                containerId, List.of(STATUS_STORED, STATUS_PENDING, STATUS_RELOCATING)).orElse(null);

        for (RelocationMove bm : blockerMoves) {
            ContainerPosition blockerPos = positionRepository
                    .findByContainerContainerId(bm.getContainerId()).orElse(null);
            if (blockerPos != null) {
                ContainerPositionHistory bHist = new ContainerPositionHistory();
                bHist.setContainer(blockerPos.getContainer());
                bHist.setFromSlot(slotRepository.findById(bm.getFromSlotId()).orElse(null));
                bHist.setFromTier(bm.getFromTier());
                bHist.setToSlot(slotRepository.findById(bm.getToSlotId()).orElse(null));
                bHist.setToTier(bm.getToTier());
                bHist.setReason(bm.getPurpose());
                bHist.setDamageReport(report);
                historyRepository.save(bHist);
            }
        }

        // Relocate the container back to the original yard
        RelocationRequest moveReq = new RelocationRequest();
        moveReq.setContainerId(containerId);
        moveReq.setTargetSlotId(top.getSlotId());
        moveReq.setTargetTier(top.getRecommendedTier());
        relocationService.relocate(moveReq);

        // Cập nhật container.status -> IN_YARD (đã rời khỏi kho hỏng)
        container.setStatus(statusRepository.findByStatusName(CTN_IN_YARD)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Status IN_YARD missing")));
        containerRepository.save(container);

        // Update order status to REPAIRED
        List<com.anhnht.warehouse.service.modules.booking.entity.Order> allOrders = orderRepository.findOrdersByContainerId(containerId);
        for (com.anhnht.warehouse.service.modules.booking.entity.Order o : allOrders) {
            if (!List.of("CANCELLED", "REJECTED", "EXPORTED").contains(o.getStatus().getStatusName())) {
                orderStatusRepository.findByStatusNameIgnoreCase("REPAIRED").ifPresent(o::setStatus);
                orderRepository.save(o);
            }
        }

        // Cập nhật yard_storage trỏ về yard mới
        positionRepository.findByContainerContainerId(containerId).ifPresent(pos -> {
            var yard = pos.getSlot().getBlock().getZone().getYard();
            storageRepository.findActiveByContainerId(containerId).ifPresent(active -> {
                active.setYard(yard);
                active.setNote("Tự động chuyển về kho gốc sau sửa chữa (ML score=" + top.getMlScore() + ")");
                storageRepository.save(active);
            });
        });

        // Đóng damage_report STORED hiện tại sang RETURNED
        if (report != null) {
            report.setReportStatus(STATUS_RETURNED);
            report.setCompletedAt(LocalDateTime.now());
            
            // Hoàn tiền vào ví
            if (report.getCompensationCost() != null 
                && report.getCompensationCost().compareTo(java.math.BigDecimal.ZERO) > 0
                && !Boolean.TRUE.equals(report.getCompensationRefunded())
                && container.getOwner() != null 
                && container.getOwner().getUserId() != null) {
                
                Integer ownerId = container.getOwner().getUserId();
                java.math.BigDecimal amount = report.getCompensationCost();
                String note = String.format("Hoàn tiền đền bù chậm lịch trình cho container %s", container.getContainerId());
                walletService.creditWalletForRefund(ownerId, amount, note);
                
                report.setCompensationRefunded(true);
                report.setCompensationRefundedAt(LocalDateTime.now());
                try {
                    notificationService.notify(
                            "Đã hoàn tiền đền bù container chậm lịch",
                            String.format("Container %s gặp sự cố và bị chậm lịch trình. Số tiền %s VND đã được hoàn vào ví của bạn.",
                                    container.getContainerId(),
                                    amount.stripTrailingZeros().toPlainString()),
                            ownerId);
                } catch (Exception e) {
                    log.warn("[Damage] container={} notify owner failed: {}", container.getContainerId(), e.getMessage());
                }
            }
            
            reportRepository.save(report);
        }

        // Clear repair info from container to prevent leak to future damage reports
        container.setRepairStatus(null);
        container.setRepairDate(null);
        container.setRepairCost(null);
        container.setCompensationCost(null);
        container.setCompensationRefunded(false);
        container.setCompensationRefundedAt(null);
        containerRepository.save(container);

        // History
        ContainerPositionHistory hist = new ContainerPositionHistory();
        hist.setContainer(container);
        hist.setFromSlot(slotRepository.findById(fromSlotId).orElse(null));
        hist.setFromTier(fromTier);
        hist.setToSlot(slotRepository.findById(top.getSlotId()).orElse(null));
        hist.setToTier(top.getRecommendedTier());
        hist.setReason("RETURN_AFTER_REPAIR");
        hist.setDamageReport(report);
        historyRepository.save(hist);

        log.info("[Damage] container={} returned to {} ({}) slot={} tier={} ml_score={}, {} blocker relocations",
                containerId, top.getYardName(), top.getZoneName(),
                top.getSlotId(), top.getRecommendedTier(), top.getMlScore(), blockerMoves.size());

        DamageReportResponse response = report != null ? toResponse(report) : DamageReportResponse.builder()
                .containerId(containerId).containerCode(containerId)
                .reportStatus(STATUS_RETURNED).build();
        if (!blockerMoves.isEmpty()) {
            response.setRelocationMessage(buildRelocationMessage(blockerMoves, "chuyển về kho gốc"));
        }
        return response;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private DamageReport findActiveReport(String containerId) {
        return reportRepository
                .findFirstByContainerContainerIdAndReportStatusIn(
                        containerId, List.of(STATUS_PENDING, STATUS_RELOCATING))
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Không tìm thấy báo hỏng đang xử lý cho container: " + containerId));
    }

    private void executeMove(RelocationMove move, DamageReport report) {
        ContainerPosition before = positionRepository
                .findByContainerContainerId(move.getContainerId())
                .orElse(null);

        if (before == null) {
            // Container chưa có vị trí (ví dụ: đang là PlacementTask)
            Container c = containerRepository.findById(move.getContainerId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy container"));
            
            ContainerPosition newPos = new ContainerPosition();
            newPos.setContainer(c);
            newPos.setSlot(slotRepository.findById(move.getToSlotId()).orElse(null));
            newPos.setTier(move.getToTier());
            positionRepository.save(newPos);
            
            placementTaskRepository.findByContainerContainerIdAndStatus(move.getContainerId(), "PENDING").stream()
                    .findFirst()
                    .ifPresent(task -> {
                        task.setStatus("CANCELLED");
                        placementTaskRepository.save(task);
                    });
            
            ContainerPositionHistory hist = new ContainerPositionHistory();
            hist.setContainer(c);
            hist.setToSlot(newPos.getSlot());
            hist.setToTier(newPos.getTier());
            hist.setReason(move.getPurpose());
            hist.setDamageReport(report);
            historyRepository.save(hist);
            return;
        }

        Integer fromSlotId = before.getSlot().getSlotId();
        Integer fromTier   = before.getTier();

        RelocationRequest req = new RelocationRequest();
        req.setContainerId(move.getContainerId());
        req.setTargetSlotId(move.getToSlotId());
        req.setTargetTier(move.getToTier());
        relocationService.relocate(req);

        ContainerPositionHistory hist = new ContainerPositionHistory();
        hist.setContainer(before.getContainer());
        hist.setFromSlot(slotRepository.findById(fromSlotId).orElse(null));
        hist.setFromTier(fromTier);
        hist.setToSlot(slotRepository.findById(move.getToSlotId()).orElse(null));
        hist.setToTier(move.getToTier());
        hist.setReason(move.getPurpose());
        hist.setDamageReport(report);
        historyRepository.save(hist);
    }

    private DamageReportResponse toResponse(DamageReport r) {
        Container c = r.getContainer();
        ContainerPosition pos = positionRepository
                .findByContainerContainerId(c.getContainerId()).orElse(null);

        String yardName = null, zoneName = null, slotLabel = null;
        Integer tier = null;
        if (pos != null) {
            var slot  = pos.getSlot();
            var block = slot.getBlock();
            var zone  = block.getZone();
            var yard  = zone.getYard();
            yardName  = yard != null ? yard.getYardName() : null;
            zoneName  = zone.getZoneName();
            tier      = pos.getTier();
            slotLabel = String.format("R%dB%d", slot.getRowNo(), slot.getBayNo());
        }

        String weightStr = c.getGrossWeight() != null
                ? c.getGrossWeight().stripTrailingZeros().toPlainString() + " kg"
                : null;

        java.time.LocalDate exitDate = storageRepository.findExpectedExitDate(c.getContainerId()).orElse(null);
        if (exitDate == null) {
            List<com.anhnht.warehouse.service.modules.booking.entity.Order> orders = orderRepository.findOrdersByContainerId(c.getContainerId());
            if (!orders.isEmpty()) {
                exitDate = orders.get(0).getExportDate();
                if (exitDate == null) {
                    exitDate = orders.get(0).getRequestedExportDate();
                }
            }
        }

        return DamageReportResponse.builder()
                .reportId(r.getReportId())
                .containerId(c.getContainerId())
                .containerCode(c.getContainerId())
                .cargoTypeName(c.getCargoType() != null ? c.getCargoType().getCargoTypeName() : null)
                .sizeType(c.getContainerType() != null ? c.getContainerType().getContainerTypeName() : null)
                .currentYard(yardName)
                .currentZone(zoneName)
                .currentTier(tier)
                .currentSlot(slotLabel)
                .grossWeight(weightStr)
                .severity(r.getSeverity())
                .reason(r.getReason())
                .photoUrls(deserialize(r.getPhotoUrls()))
                .reportedBy(r.getReportedBy() != null ? r.getReportedBy().getUsername() : null)
                .reportedAt(r.getReportedAt())
                .reportStatus(r.getReportStatus())
                .completedAt(r.getCompletedAt())
                .expectedExitDate(exitDate)
                .repairStatus(r.getRepairStatus() != null ? r.getRepairStatus() : c.getRepairStatus())
                .repairDate(r.getRepairDate() != null ? r.getRepairDate() : c.getRepairDate())
                .repairCost(r.getRepairCost() != null ? r.getRepairCost() : c.getRepairCost())
                .compensationCost(r.getCompensationCost() != null ? r.getCompensationCost() : c.getCompensationCost())
                .compensationRefunded(r.getCompensationRefunded() != null ? r.getCompensationRefunded() : c.getCompensationRefunded())
                .compensationRefundedAt(r.getCompensationRefundedAt() != null ? r.getCompensationRefundedAt() : c.getCompensationRefundedAt())
                .build();
    }

    private String serialize(Object value) {
        if (value == null) return null;
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException e) { return null; }
    }

    private List<String> deserialize(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try { return objectMapper.readValue(json, new TypeReference<List<String>>() {}); }
        catch (Exception e) { return Collections.emptyList(); }
    }

    /**
     * Builds a human-readable Vietnamese message about relocation moves for the user.
     */
    private String buildRelocationMessage(List<RelocationMove> moves, String action) {
        if (moves == null || moves.isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        sb.append("⚠️ Để ").append(action).append(", hệ thống đã đảo chuyển ")
          .append(moves.size()).append(" container chặn:\n");
        for (int i = 0; i < moves.size(); i++) {
            RelocationMove m = moves.get(i);
            sb.append(String.format("  %d. %s: %s R%dB%d Tier%d → %s R%dB%d Tier%d\n",
                    i + 1,
                    m.getContainerId(),
                    m.getFromZone(), m.getFromRow(), m.getFromBay(), m.getFromTier(),
                    m.getToZone(),   m.getToRow(),   m.getToBay(),   m.getToTier()));
        }
        return sb.toString().trim();
    }
}

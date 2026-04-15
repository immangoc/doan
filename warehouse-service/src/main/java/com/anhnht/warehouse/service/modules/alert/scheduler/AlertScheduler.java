package com.anhnht.warehouse.service.modules.alert.scheduler;

import com.anhnht.warehouse.service.common.constant.AppConstant;
import com.anhnht.warehouse.service.modules.alert.service.AlertService;
import com.anhnht.warehouse.service.modules.alert.service.NotificationService;
import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import com.anhnht.warehouse.service.modules.gatein.repository.ContainerPositionRepository;
import com.anhnht.warehouse.service.modules.gatein.repository.YardStorageRepository;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import com.anhnht.warehouse.service.modules.yard.repository.YardZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlertScheduler {

    private final YardStorageRepository     yardStorageRepository;
    private final YardZoneRepository        yardZoneRepository;
    private final ContainerPositionRepository containerPositionRepository;
    private final AlertService              alertService;
    private final NotificationService       notificationService;
    private final UserRepository            userRepository;

    /**
     * Daily at 08:00 — check exit deadlines and overdue containers.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void checkExitDeadlines() {
        log.info("[AlertScheduler] Running exit deadline check...");

        LocalDate today = LocalDate.now();
        LocalDate warnCutoff   = today.plusDays(AppConstant.DEADLINE_WARN_DAYS);
        LocalDate urgentCutoff = today.plusDays(AppConstant.DEADLINE_URGENT_DAYS);

        // Fetch all storage records with expected exit date ≤ WARN_DAYS from today
        List<YardStorage> upcoming = yardStorageRepository.findWithExitOnOrBefore(warnCutoff);

        Integer[] adminIds = getAdminIds();

        for (YardStorage storage : upcoming) {
            String containerId  = storage.getContainer().getContainerId();
            String containerStatus = storage.getContainer().getStatus() != null
                    ? storage.getContainer().getStatus().getStatusName() : "";

            // Skip containers already out of yard
            if ("GATE_OUT".equalsIgnoreCase(containerStatus)
                    || "EXPORTED".equalsIgnoreCase(containerStatus)) {
                continue;
            }

            LocalDate exitDate = storage.getStorageEndDate();

            if (exitDate.isBefore(today)) {
                // OVERDUE — exit date already passed
                String desc = String.format("Container %s is OVERDUE (expected exit: %s). Immediate action required.",
                        containerId, exitDate);
                alertService.createAlert(findZoneForStorage(storage), "CRITICAL", desc);
                notifyAdmins(adminIds, AppConstant.ALERT_OVERDUE,
                        String.format("Container %s is overdue since %s", containerId, exitDate));

            } else if (!exitDate.isAfter(urgentCutoff)) {
                // URGENT — exit within DEADLINE_URGENT_DAYS days
                long daysLeft = today.until(exitDate, java.time.temporal.ChronoUnit.DAYS);
                String desc = String.format("Container %s exits in %d day(s) on %s — URGENT.",
                        containerId, daysLeft, exitDate);
                alertService.createAlert(findZoneForStorage(storage), "CRITICAL", desc);
                notifyAdmins(adminIds, AppConstant.ALERT_URGENT_EXIT,
                        String.format("Container %s exits in %d day(s)", containerId, daysLeft));

            } else {
                // UPCOMING — exit within DEADLINE_WARN_DAYS days
                long daysLeft = today.until(exitDate, java.time.temporal.ChronoUnit.DAYS);
                String desc = String.format("Container %s exits in %d day(s) on %s.",
                        containerId, daysLeft, exitDate);
                alertService.createAlert(findZoneForStorage(storage), "WARNING", desc);
                notifyAdmins(adminIds, AppConstant.ALERT_UPCOMING_EXIT,
                        String.format("Container %s exits in %d day(s)", containerId, daysLeft));
            }
        }

        log.info("[AlertScheduler] Exit deadline check completed. Processed {} records.", upcoming.size());
    }

    /**
     * Every 30 minutes — check zone occupancy rates.
     */
    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    public void checkZoneOccupancy() {
        log.info("[AlertScheduler] Running zone occupancy check...");

        List<YardZone> zones = yardZoneRepository.findAll();
        Integer[] adminIds  = getAdminIds();

        for (YardZone zone : zones) {
            int capacity = zone.getCapacitySlots();
            if (capacity <= 0) continue;

            long occupied    = containerPositionRepository.countOccupiedInZone(zone.getZoneId());
            double occupancy = (double) occupied / capacity;

            boolean isColdZone = zone.getYard() != null
                    && zone.getYard().getYardType() != null
                    && "cold".equalsIgnoreCase(zone.getYard().getYardType().getYardTypeName());

            if (occupancy >= AppConstant.OCC_CRITICAL_THRESHOLD) {
                String alertType = isColdZone ? AppConstant.ALERT_COLD_FULL : AppConstant.ALERT_ZONE_CRITICAL;
                String desc = String.format("Zone '%s' occupancy is CRITICAL: %.1f%% (%.0f/%d slots occupied).",
                        zone.getZoneName(), occupancy * 100, (double) occupied, capacity);
                alertService.createAlert(zone, "CRITICAL", desc);
                notifyAdmins(adminIds, alertType,
                        String.format("Zone %s at %.1f%% capacity", zone.getZoneName(), occupancy * 100));

            } else if (occupancy >= AppConstant.OCC_WARN_THRESHOLD) {
                String desc = String.format("Zone '%s' occupancy WARNING: %.1f%% (%.0f/%d slots occupied).",
                        zone.getZoneName(), occupancy * 100, (double) occupied, capacity);
                alertService.createAlert(zone, "WARNING", desc);
                notifyAdmins(adminIds, AppConstant.ALERT_ZONE_WARNING,
                        String.format("Zone %s at %.1f%% capacity", zone.getZoneName(), occupancy * 100));
            }
        }

        log.info("[AlertScheduler] Zone occupancy check completed for {} zones.", zones.size());
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private YardZone findZoneForStorage(YardStorage storage) {
        if (storage.getYard() == null) return null;
        List<YardZone> zones = yardZoneRepository.findAllByYardYardId(storage.getYard().getYardId());
        return zones.isEmpty() ? null : zones.get(0);
    }

    private Integer[] getAdminIds() {
        return userRepository.findAllByRoleName("ADMIN",
                        org.springframework.data.domain.Pageable.unpaged())
                .stream()
                .map(u -> u.getUserId())
                .toArray(Integer[]::new);
    }

    private void notifyAdmins(Integer[] adminIds, String title, String description) {
        if (adminIds.length > 0) {
            notificationService.notify(title, description, adminIds);
        }
    }
}

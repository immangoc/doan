package com.anhnht.warehouse.service.modules.yard.controller;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.entity.YardZone;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import com.anhnht.warehouse.service.modules.yard.repository.YardZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Slot & Zone lock / unlock management.
 */
@Tag(name = "Khóa vị trí kho", description = "Quản lý khóa/mở slot và zone kho")
@RestController
@RequestMapping("/admin/slot-lock")
@RequiredArgsConstructor
public class SlotController {

    private final SlotRepository slotRepository;
    private final YardZoneRepository yardZoneRepository;

    // ── Slot lock/unlock ──────────────────────────────────────────────────

    @PutMapping("/slots/{slotId}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<SlotStatusDto>> lockSlot(
            @PathVariable Integer slotId,
            @RequestBody(required = false) Map<String, String> body) {
        Slot slot = findSlot(slotId);
        slot.setIsLocked(true);
        slot.setLockReason(body != null ? body.get("reason") : null);
        slotRepository.save(slot);
        return ResponseEntity.ok(ApiResponse.success(toDto(slot)));
    }

    @PutMapping("/slots/{slotId}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<SlotStatusDto>> unlockSlot(@PathVariable Integer slotId) {
        Slot slot = findSlot(slotId);
        slot.setIsLocked(false);
        slot.setLockReason(null);
        slotRepository.save(slot);
        return ResponseEntity.ok(ApiResponse.success(toDto(slot)));
    }

    /** All locked slot IDs — used by 3D/2D views to render red overlay. */
    @GetMapping("/slots/locked")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    public ResponseEntity<ApiResponse<List<SlotStatusDto>>> getLockedSlots() {
        List<SlotStatusDto> locked = slotRepository.findAll().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsLocked()))
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(locked));
    }

    // ── Zone lock/unlock ──────────────────────────────────────────────────

    @PutMapping("/zones/{zoneId}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> lockZone(@PathVariable Integer zoneId) {
        YardZone zone = yardZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ZONE_NOT_FOUND, "Zone not found: " + zoneId));
        zone.setIsLocked(true);
        yardZoneRepository.save(zone);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("zoneId", zoneId, "zoneName", zone.getZoneName(), "isLocked", true)));
    }

    @PutMapping("/zones/{zoneId}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR','YARD_STAFF')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> unlockZone(@PathVariable Integer zoneId) {
        YardZone zone = yardZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ZONE_NOT_FOUND, "Zone not found: " + zoneId));
        zone.setIsLocked(false);
        yardZoneRepository.save(zone);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("zoneId", zoneId, "zoneName", zone.getZoneName(), "isLocked", false)));
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private Slot findSlot(Integer slotId) {
        return slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SLOT_NOT_FOUND,
                        "Slot not found: " + slotId));
    }

    private SlotStatusDto toDto(Slot slot) {
        SlotStatusDto dto = new SlotStatusDto();
        dto.slotId     = slot.getSlotId();
        dto.rowNo      = slot.getRowNo();
        dto.bayNo      = slot.getBayNo();
        dto.maxTier    = slot.getMaxTier();
        dto.isLocked   = Boolean.TRUE.equals(slot.getIsLocked());
        dto.lockReason = slot.getLockReason();
        return dto;
    }

    public static class SlotStatusDto {
        public Integer slotId;
        public Integer rowNo;
        public Integer bayNo;
        public Integer maxTier;
        public boolean isLocked;
        public String  lockReason;
    }
}

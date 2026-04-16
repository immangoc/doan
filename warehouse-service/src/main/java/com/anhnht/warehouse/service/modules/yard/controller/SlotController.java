package com.anhnht.warehouse.service.modules.yard.controller;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.yard.entity.Slot;
import com.anhnht.warehouse.service.modules.yard.repository.SlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Slot lock / unlock management.
 * Staff reports a slot as unusable; manager locks it to prevent assignment.
 */
@RestController
@RequestMapping("/admin/slots")
@RequiredArgsConstructor
public class SlotController {

    private final SlotRepository slotRepository;

    /**
     * PUT /admin/slots/{slotId}/lock
     * Body (optional): { "reason": "flooding in zone A" }
     */
    @PutMapping("/{slotId}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<SlotStatusDto>> lockSlot(
            @PathVariable Integer slotId,
            @RequestBody(required = false) Map<String, String> body) {

        Slot slot = findSlot(slotId);
        slot.setIsLocked(true);
        slot.setLockReason(body != null ? body.get("reason") : null);
        slotRepository.save(slot);
        return ResponseEntity.ok(ApiResponse.success(toDto(slot)));
    }

    /**
     * PUT /admin/slots/{slotId}/unlock
     */
    @PutMapping("/{slotId}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<SlotStatusDto>> unlockSlot(@PathVariable Integer slotId) {
        Slot slot = findSlot(slotId);
        slot.setIsLocked(false);
        slot.setLockReason(null);
        slotRepository.save(slot);
        return ResponseEntity.ok(ApiResponse.success(toDto(slot)));
    }

    /**
     * GET /admin/slots/{slotId}
     */
    @GetMapping("/{slotId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<SlotStatusDto>> getSlot(@PathVariable Integer slotId) {
        return ResponseEntity.ok(ApiResponse.success(toDto(findSlot(slotId))));
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

    // ── inner DTO ─────────────────────────────────────────────────────────

    public static class SlotStatusDto {
        public Integer slotId;
        public Integer rowNo;
        public Integer bayNo;
        public Integer maxTier;
        public boolean isLocked;
        public String  lockReason;
    }
}

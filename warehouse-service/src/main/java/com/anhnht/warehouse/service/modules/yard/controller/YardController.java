package com.anhnht.warehouse.service.modules.yard.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.modules.yard.dto.request.*;
import com.anhnht.warehouse.service.modules.yard.dto.response.*;
import com.anhnht.warehouse.service.modules.yard.mapper.YardMapper;
import com.anhnht.warehouse.service.modules.yard.service.YardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class YardController {

    private final YardService yardService;
    private final YardMapper  yardMapper;

    // ============================================================
    // Reference data (seeded — read only)
    // ============================================================

    @GetMapping("/yard-types")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<YardTypeResponse>>> getYardTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardTypeResponses(yardService.getAllYardTypes())));
    }

    @GetMapping("/block-types")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<BlockTypeResponse>>> getBlockTypes() {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toBlockTypeResponses(yardService.getAllBlockTypes())));
    }

    // ============================================================
    // Yards
    // ============================================================

    @GetMapping("/yards")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<YardResponse>>> getYards() {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardResponses(yardService.getAllYards())));
    }

    @GetMapping("/yards/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<YardResponse>> getYard(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardResponse(yardService.findYardById(id))));
    }

    @PostMapping("/yards")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<YardResponse>> createYard(
            @Valid @RequestBody YardRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                yardMapper.toYardResponse(yardService.createYard(request))));
    }

    @PutMapping("/yards/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<YardResponse>> updateYard(
            @PathVariable Integer id,
            @Valid @RequestBody YardRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardResponse(yardService.updateYard(id, request))));
    }

    @DeleteMapping("/yards/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteYard(@PathVariable Integer id) {
        yardService.deleteYard(id);
        return ResponseEntity.ok(ApiResponse.noContent("Yard deleted"));
    }

    // ============================================================
    // Zones
    // ============================================================

    @GetMapping("/yards/{yardId}/zones")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<YardZoneResponse>>> getZones(
            @PathVariable Integer yardId) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardZoneResponses(yardService.getZonesByYardId(yardId))));
    }

    @GetMapping("/zones/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<YardZoneResponse>> getZone(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardZoneResponse(yardService.findZoneById(id))));
    }

    @PostMapping("/yards/{yardId}/zones")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<YardZoneResponse>> createZone(
            @PathVariable Integer yardId,
            @Valid @RequestBody YardZoneRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                yardMapper.toYardZoneResponse(yardService.createZone(yardId, request))));
    }

    @PutMapping("/zones/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<YardZoneResponse>> updateZone(
            @PathVariable Integer id,
            @Valid @RequestBody YardZoneRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toYardZoneResponse(yardService.updateZone(id, request))));
    }

    @DeleteMapping("/zones/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteZone(@PathVariable Integer id) {
        yardService.deleteZone(id);
        return ResponseEntity.ok(ApiResponse.noContent("Zone deleted"));
    }

    // ============================================================
    // Blocks
    // ============================================================

    @GetMapping("/zones/{zoneId}/blocks")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<BlockResponse>>> getBlocks(
            @PathVariable Integer zoneId) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toBlockResponses(yardService.getBlocksByZoneId(zoneId))));
    }

    @GetMapping("/blocks/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<BlockResponse>> getBlock(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toBlockResponse(yardService.findBlockById(id))));
    }

    @PostMapping("/zones/{zoneId}/blocks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BlockResponse>> createBlock(
            @PathVariable Integer zoneId,
            @Valid @RequestBody BlockRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                yardMapper.toBlockResponse(yardService.createBlock(zoneId, request))));
    }

    @PutMapping("/blocks/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BlockResponse>> updateBlock(
            @PathVariable Integer id,
            @Valid @RequestBody BlockRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toBlockResponse(yardService.updateBlock(id, request))));
    }

    @DeleteMapping("/blocks/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteBlock(@PathVariable Integer id) {
        yardService.deleteBlock(id);
        return ResponseEntity.ok(ApiResponse.noContent("Block deleted"));
    }

    // ============================================================
    // Slots
    // ============================================================

    @GetMapping("/blocks/{blockId}/slots")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<List<SlotResponse>>> getSlots(
            @PathVariable Integer blockId) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toSlotResponses(yardService.getSlotsByBlockId(blockId))));
    }

    @GetMapping("/slots/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<SlotResponse>> getSlot(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toSlotResponse(yardService.findSlotById(id))));
    }

    @PostMapping("/blocks/{blockId}/slots")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SlotResponse>> createSlot(
            @PathVariable Integer blockId,
            @Valid @RequestBody SlotRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(
                yardMapper.toSlotResponse(yardService.createSlot(blockId, request))));
    }

    @PostMapping("/blocks/{blockId}/slots/batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchCreateSlots(
            @PathVariable Integer blockId,
            @Valid @RequestBody SlotBatchRequest request) {
        int created = yardService.batchCreateSlots(blockId, request);
        return ResponseEntity.status(201).body(ApiResponse.created(Map.of("created", created)));
    }

    @PutMapping("/slots/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SlotResponse>> updateSlot(
            @PathVariable Integer id,
            @Valid @RequestBody SlotRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toSlotResponse(yardService.updateSlot(id, request))));
    }

    @DeleteMapping("/slots/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSlot(@PathVariable Integer id) {
        yardService.deleteSlot(id);
        return ResponseEntity.ok(ApiResponse.noContent("Slot deleted"));
    }

    // ============================================================
    // Slot locking (Khóa / Mở vị trí)
    // ============================================================

    @PostMapping("/slots/{id}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<SlotResponse>> lockSlot(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        String reason = null;
        if (body != null && body.get("reason") != null) {
            reason = String.valueOf(body.get("reason"));
        }
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toSlotResponse(yardService.lockSlot(id, reason))
        ));
    }

    @PostMapping("/slots/{id}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ApiResponse<SlotResponse>> unlockSlot(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                yardMapper.toSlotResponse(yardService.unlockSlot(id))
        ));
    }
}

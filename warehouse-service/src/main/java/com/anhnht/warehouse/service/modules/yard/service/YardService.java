package com.anhnht.warehouse.service.modules.yard.service;

import com.anhnht.warehouse.service.modules.yard.dto.request.*;
import com.anhnht.warehouse.service.modules.yard.entity.*;

import java.util.List;

public interface YardService {

    // Yard types (seeded reference data — read only)
    List<YardType>  getAllYardTypes();
    List<BlockType> getAllBlockTypes();

    // Yards
    List<Yard> getAllYards();
    Yard findYardById(Integer yardId);
    Yard createYard(YardRequest request);
    Yard updateYard(Integer yardId, YardRequest request);
    void deleteYard(Integer yardId);

    // Zones
    List<YardZone> getZonesByYardId(Integer yardId);
    YardZone findZoneById(Integer zoneId);
    YardZone createZone(Integer yardId, YardZoneRequest request);
    YardZone updateZone(Integer zoneId, YardZoneRequest request);
    void deleteZone(Integer zoneId);

    // Blocks
    List<Block> getBlocksByZoneId(Integer zoneId);
    Block findBlockById(Integer blockId);
    Block createBlock(Integer zoneId, BlockRequest request);
    Block updateBlock(Integer blockId, BlockRequest request);
    void deleteBlock(Integer blockId);

    // Slots
    List<Slot> getSlotsByBlockId(Integer blockId);
    Slot findSlotById(Integer slotId);
    Slot createSlot(Integer blockId, SlotRequest request);
    int batchCreateSlots(Integer blockId, SlotBatchRequest request);
    Slot updateSlot(Integer slotId, SlotRequest request);
    void deleteSlot(Integer slotId);

    Slot lockSlot(Integer slotId, String reason);
    Slot unlockSlot(Integer slotId);
}

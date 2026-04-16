package com.anhnht.warehouse.service.modules.yard.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.yard.dto.request.*;
import com.anhnht.warehouse.service.modules.yard.entity.*;
import com.anhnht.warehouse.service.modules.yard.repository.*;
import com.anhnht.warehouse.service.modules.yard.service.YardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class YardServiceImpl implements YardService {

    private final YardTypeRepository  yardTypeRepository;
    private final YardRepository      yardRepository;
    private final YardZoneRepository  yardZoneRepository;
    private final BlockTypeRepository blockTypeRepository;
    private final BlockRepository     blockRepository;
    private final SlotRepository      slotRepository;

    // ---- Reference data ----

    @Override
    public List<YardType> getAllYardTypes() {
        return yardTypeRepository.findAll();
    }

    @Override
    public List<BlockType> getAllBlockTypes() {
        return blockTypeRepository.findAll();
    }

    // ---- Yards ----

    @Override
    public List<Yard> getAllYards() {
        return yardRepository.findAll();
    }

    @Override
    public Yard findYardById(Integer yardId) {
        return yardRepository.findById(yardId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Yard not found: " + yardId));
    }

    @Override
    @Transactional
    public Yard createYard(YardRequest request) {
        YardType yardType = yardTypeRepository.findById(request.getYardTypeId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "YardType not found: " + request.getYardTypeId()));

        Yard yard = new Yard();
        yard.setYardType(yardType);
        yard.setYardName(request.getYardName());
        yard.setAddress(request.getAddress());
        return yardRepository.save(yard);
    }

    @Override
    @Transactional
    public Yard updateYard(Integer yardId, YardRequest request) {
        Yard yard = findYardById(yardId);
        if (request.getYardTypeId() != null) {
            YardType yardType = yardTypeRepository.findById(request.getYardTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "YardType not found: " + request.getYardTypeId()));
            yard.setYardType(yardType);
        }
        if (request.getYardName() != null) yard.setYardName(request.getYardName());
        if (request.getAddress()  != null) yard.setAddress(request.getAddress());
        return yardRepository.save(yard);
    }

    @Override
    @Transactional
    public void deleteYard(Integer yardId) {
        yardRepository.delete(findYardById(yardId));
    }

    // ---- Zones ----

    @Override
    public List<YardZone> getZonesByYardId(Integer yardId) {
        return yardZoneRepository.findAllByYardYardId(yardId);
    }

    @Override
    public YardZone findZoneById(Integer zoneId) {
        return yardZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Zone not found: " + zoneId));
    }

    @Override
    @Transactional
    public YardZone createZone(Integer yardId, YardZoneRequest request) {
        Yard yard = findYardById(yardId);
        YardZone zone = new YardZone();
        zone.setYard(yard);
        zone.setZoneName(request.getZoneName());
        zone.setCapacitySlots(request.getCapacitySlots());
        return yardZoneRepository.save(zone);
    }

    @Override
    @Transactional
    public YardZone updateZone(Integer zoneId, YardZoneRequest request) {
        YardZone zone = findZoneById(zoneId);
        if (request.getZoneName()     != null) zone.setZoneName(request.getZoneName());
        if (request.getCapacitySlots() != null) zone.setCapacitySlots(request.getCapacitySlots());
        return yardZoneRepository.save(zone);
    }

    @Override
    @Transactional
    public void deleteZone(Integer zoneId) {
        yardZoneRepository.delete(findZoneById(zoneId));
    }

    // ---- Blocks ----

    @Override
    public List<Block> getBlocksByZoneId(Integer zoneId) {
        return blockRepository.findAllByZoneZoneId(zoneId);
    }

    @Override
    public Block findBlockById(Integer blockId) {
        return blockRepository.findById(blockId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Block not found: " + blockId));
    }

    @Override
    @Transactional
    public Block createBlock(Integer zoneId, BlockRequest request) {
        YardZone zone = findZoneById(zoneId);
        Block block = new Block();
        block.setZone(zone);
        block.setBlockName(request.getBlockName());
        if (request.getBlockTypeId() != null) {
            BlockType blockType = blockTypeRepository.findById(request.getBlockTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "BlockType not found: " + request.getBlockTypeId()));
            block.setBlockType(blockType);
        }
        return blockRepository.save(block);
    }

    @Override
    @Transactional
    public Block updateBlock(Integer blockId, BlockRequest request) {
        Block block = findBlockById(blockId);
        if (request.getBlockName() != null) block.setBlockName(request.getBlockName());
        if (request.getBlockTypeId() != null) {
            BlockType blockType = blockTypeRepository.findById(request.getBlockTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "BlockType not found: " + request.getBlockTypeId()));
            block.setBlockType(blockType);
        }
        return blockRepository.save(block);
    }

    @Override
    @Transactional
    public void deleteBlock(Integer blockId) {
        blockRepository.delete(findBlockById(blockId));
    }

    // ---- Slots ----

    @Override
    public List<Slot> getSlotsByBlockId(Integer blockId) {
        return slotRepository.findAllByBlockBlockId(blockId);
    }

    @Override
    public Slot findSlotById(Integer slotId) {
        return slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SLOT_NOT_FOUND));
    }

    @Override
    @Transactional
    public Slot createSlot(Integer blockId, SlotRequest request) {
        Block block = findBlockById(blockId);
        if (slotRepository.existsByBlockBlockIdAndRowNoAndBayNo(blockId, request.getRowNo(), request.getBayNo())) {
            throw new BusinessException(ErrorCode.SLOT_OCCUPIED,
                    "Slot row=" + request.getRowNo() + " bay=" + request.getBayNo() + " already exists in this block");
        }
        Slot slot = new Slot();
        slot.setBlock(block);
        slot.setRowNo(request.getRowNo());
        slot.setBayNo(request.getBayNo());
        slot.setMaxTier(request.getMaxTier() != null ? request.getMaxTier() : 5);
        return slotRepository.save(slot);
    }

    @Override
    @Transactional
    public int batchCreateSlots(Integer blockId, SlotBatchRequest request) {
        Block block = findBlockById(blockId);
        List<Slot> slots = new ArrayList<>();
        int created = 0;
        for (int row = 1; row <= request.getRows(); row++) {
            for (int bay = 1; bay <= request.getBays(); bay++) {
                if (!slotRepository.existsByBlockBlockIdAndRowNoAndBayNo(blockId, row, bay)) {
                    Slot slot = new Slot();
                    slot.setBlock(block);
                    slot.setRowNo(row);
                    slot.setBayNo(bay);
                    slot.setMaxTier(request.getMaxTier() != null ? request.getMaxTier() : 5);
                    slots.add(slot);
                    created++;
                }
            }
        }
        slotRepository.saveAll(slots);
        return created;
    }

    @Override
    @Transactional
    public Slot updateSlot(Integer slotId, SlotRequest request) {
        Slot slot = findSlotById(slotId);
        if (request.getMaxTier() != null) slot.setMaxTier(request.getMaxTier());
        return slotRepository.save(slot);
    }

    @Override
    @Transactional
    public void deleteSlot(Integer slotId) {
        slotRepository.delete(findSlotById(slotId));
    }
}

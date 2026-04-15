package com.anhnht.warehouse.service.modules.container.service;

import com.anhnht.warehouse.service.modules.container.entity.Container;

import java.time.LocalDate;

public interface DamageWorkflowService {

    /**
     * Auto move a container into the damaged yard area (Kho hỏng).
     * This operation:
     * - validates the container has an active position
     * - relocates it to a free slot in yardType=damaged at tier 1
     * - updates repairStatus to REPAIRING (damage details)
     * - ensures its container status becomes DAMAGED (via relocation status sync)
     */
    Container moveToDamagedYard(String containerId);

    /**
     * Updates expected exit date (planned export date) on the active yard_storage record.
     */
    void setExpectedExitDate(String containerId, LocalDate expectedExitDate);
}


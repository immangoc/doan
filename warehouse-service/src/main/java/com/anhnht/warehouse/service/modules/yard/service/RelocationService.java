package com.anhnht.warehouse.service.modules.yard.service;

import com.anhnht.warehouse.service.modules.yard.dto.request.RelocationRequest;
import com.anhnht.warehouse.service.modules.yard.dto.request.SwapRequest;
import com.anhnht.warehouse.service.modules.yard.dto.response.RelocationResponse;
import com.anhnht.warehouse.service.modules.yard.dto.response.SwapResponse;

public interface RelocationService {

    /**
     * Move a container from its current slot position to a new slot/tier.
     * Validates that the target slot and tier are available before moving.
     */
    RelocationResponse relocate(RelocationRequest request);

    /**
     * Atomically swap the slot/tier positions of two containers.
     * Both containers must already have an active position.
     */
    SwapResponse swap(SwapRequest request);
}

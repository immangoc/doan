package com.anhnht.warehouse.service.modules.gateout.service;

import com.anhnht.warehouse.service.modules.gateout.dto.request.GateOutRequest;
import com.anhnht.warehouse.service.modules.gateout.dto.response.StorageBillResponse;
import com.anhnht.warehouse.service.modules.gateout.dto.response.StorageInvoiceResponse;
import com.anhnht.warehouse.service.modules.gateout.entity.GateOutReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GateOutService {

    /**
     * Process gate-out for a container:
     *   1. Validate container is IN_YARD or GATE_IN
     *   2. Create gate_out_receipt
     *   3. Remove container_positions record
     *   4. Persist storage_invoice
     *   5. Update container status → GATE_OUT
     */
    GateOutReceipt processGateOut(Integer operatorId, GateOutRequest request);

    Page<GateOutReceipt> findAll(Pageable pageable);
    GateOutReceipt findById(Integer gateOutId);

    /**
     * Compute storage bill for a container based on yard_storage records.
     * Returns derived billing data — not persisted.
     */
    StorageBillResponse computeStorageBill(String containerId);

    /** Retrieve persisted invoice for a gate-out receipt. */
    StorageInvoiceResponse getInvoice(Integer gateOutId);
}

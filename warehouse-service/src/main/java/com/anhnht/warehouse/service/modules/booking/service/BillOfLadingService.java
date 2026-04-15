package com.anhnht.warehouse.service.modules.booking.service;

import com.anhnht.warehouse.service.modules.booking.dto.request.BillOfLadingRequest;
import com.anhnht.warehouse.service.modules.booking.dto.request.BillStatusUpdateRequest;
import com.anhnht.warehouse.service.modules.booking.entity.BillOfLading;
import com.anhnht.warehouse.service.modules.booking.entity.BillOfLadingHistory;

import java.util.List;

public interface BillOfLadingService {

    BillOfLading findByOrderId(Integer orderId);

    BillOfLading findById(Integer billId);

    /** Admin creates a BoL for an order (auto-generates bill number if not supplied). */
    BillOfLading create(Integer orderId, BillOfLadingRequest request);

    /** Admin updates BoL status and records history entry. */
    BillOfLading updateStatus(Integer billId, BillStatusUpdateRequest request);

    List<BillOfLadingHistory> getHistory(Integer billId);
}

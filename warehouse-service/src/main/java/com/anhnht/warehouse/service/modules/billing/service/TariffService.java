package com.anhnht.warehouse.service.modules.billing.service;

import com.anhnht.warehouse.service.modules.billing.dto.request.TariffRequest;
import com.anhnht.warehouse.service.modules.billing.entity.Tariff;

import java.util.List;

public interface TariffService {
    List<Tariff> getAll();
    List<Tariff> upsert(List<TariffRequest> requests);
}

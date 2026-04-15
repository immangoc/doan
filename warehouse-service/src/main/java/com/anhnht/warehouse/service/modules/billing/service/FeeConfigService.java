package com.anhnht.warehouse.service.modules.billing.service;

import com.anhnht.warehouse.service.modules.billing.dto.request.FeeConfigRequest;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;

public interface FeeConfigService {
    FeeConfig get();
    FeeConfig update(FeeConfigRequest request);
}

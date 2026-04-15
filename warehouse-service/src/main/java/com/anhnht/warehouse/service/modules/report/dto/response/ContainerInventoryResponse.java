package com.anhnht.warehouse.service.modules.report.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class ContainerInventoryResponse {

    private long totalContainers;

    /** {statusName → count} */
    private Map<String, Long> byStatus;

    /** {cargoTypeName → count} */
    private Map<String, Long> byCargoType;

    /** {containerTypeName → count} */
    private Map<String, Long> byContainerType;
}

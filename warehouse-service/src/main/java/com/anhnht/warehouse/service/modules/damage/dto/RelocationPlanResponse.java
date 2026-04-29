package com.anhnht.warehouse.service.modules.damage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(name = "RelocationPlanResponse",
        description = "Kết quả preview-move: danh sách các bước cần thực hiện, theo thứ tự.")
public class RelocationPlanResponse {

    private Integer            reportId;
    private String             targetContainerId;
    private boolean            feasible;
    private String             infeasibilityReason;
    private List<RelocationMove> moves;        // các blocker đảo trước, target ở cuối
    private int                blockerCount;
}

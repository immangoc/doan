package com.anhnht.warehouse.service.modules.gateout.dto.response;

import com.anhnht.warehouse.service.modules.damage.dto.RelocationMove;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class GateOutReceiptResponse {

    private Integer       gateOutId;
    private String        containerId;
    private LocalDateTime gateOutTime;
    private Integer       createdById;
    private String        createdByUsername;
    private String        note;

    /**
     * Danh sách các container đã được đảo chuyển (nếu có)
     * để lấy container này ra khỏi chồng.
     * null hoặc empty nếu không cần đảo.
     */
    private List<RelocationMove> relocationMoves;

    /**
     * Thông báo vị trí cho người dùng khi có đảo chuyển.
     */
    private String relocationMessage;
}

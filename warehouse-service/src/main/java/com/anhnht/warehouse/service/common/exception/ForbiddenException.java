package com.anhnht.warehouse.service.common.exception;

import com.anhnht.warehouse.service.common.constant.ErrorCode;

public class ForbiddenException extends BusinessException {

    public ForbiddenException(ErrorCode errorCode) {
        super(errorCode);
    }

    public ForbiddenException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}

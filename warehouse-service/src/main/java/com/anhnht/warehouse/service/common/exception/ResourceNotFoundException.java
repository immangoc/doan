package com.anhnht.warehouse.service.common.exception;

import com.anhnht.warehouse.service.common.constant.ErrorCode;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(ErrorCode errorCode) {
        super(errorCode);
    }

    public ResourceNotFoundException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public ResourceNotFoundException(String resourceName, Object id) {
        super(ErrorCode.NOT_FOUND, resourceName + " not found with id: " + id);
    }
}

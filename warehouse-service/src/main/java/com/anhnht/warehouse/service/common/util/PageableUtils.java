package com.anhnht.warehouse.service.common.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PageableUtils {

    private PageableUtils() {}

    public static Pageable of(int page, int size, String sortBy, String direction) {
        Sort.Direction dir = Sort.Direction.fromString(direction);
        return PageRequest.of(page, size, Sort.by(dir, sortBy));
    }

    public static Pageable defaultPageable() {
        return PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
    }
}

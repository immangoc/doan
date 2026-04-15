package com.anhnht.warehouse.service.common.dto.pagination;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Getter
@Setter
public class PageRequestDto {

    @Min(0)
    private int page = 0;

    @Min(1)
    @Max(100)
    private int size = 20;

    private String sortBy  = "createdAt";
    private String sortDir = "desc";

    public Pageable toPageable() {
        Sort.Direction direction = Sort.Direction.fromString(sortDir);
        return PageRequest.of(page, size, Sort.by(direction, sortBy));
    }
}

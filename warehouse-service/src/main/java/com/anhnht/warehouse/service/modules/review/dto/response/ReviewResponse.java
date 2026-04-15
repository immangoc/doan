package com.anhnht.warehouse.service.modules.review.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ReviewResponse {

    private Integer       reviewId;
    private Integer       userId;
    private String        userName;
    private String        description;
    private Integer       rating;
    private LocalDateTime createdAt;
}

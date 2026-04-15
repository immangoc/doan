package com.anhnht.warehouse.service.modules.review.service;

import com.anhnht.warehouse.service.modules.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReviewService {

    Review submit(Integer userId, String description, Integer rating);

    Page<Review> findAll(Pageable pageable);

    void delete(Integer reviewId, Integer requesterId, boolean isAdmin);
}

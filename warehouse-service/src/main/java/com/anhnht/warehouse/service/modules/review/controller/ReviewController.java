package com.anhnht.warehouse.service.modules.review.controller;

import com.anhnht.warehouse.service.common.dto.response.ApiResponse;
import com.anhnht.warehouse.service.common.dto.response.PageResponse;
import com.anhnht.warehouse.service.common.util.SecurityUtils;
import com.anhnht.warehouse.service.modules.review.dto.request.ReviewRequest;
import com.anhnht.warehouse.service.modules.review.dto.response.ReviewResponse;
import com.anhnht.warehouse.service.modules.review.mapper.ReviewMapper;
import com.anhnht.warehouse.service.modules.review.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Đánh giá", description = "Đánh giá dịch vụ kho bãi")
@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final ReviewMapper  reviewMapper;

    /**
     * POST /reviews
     * Submit a review (authenticated users).
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReviewResponse>> submit(
            @Valid @RequestBody ReviewRequest request) {
        Integer userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(201).body(ApiResponse.created(
                reviewMapper.toReviewResponse(
                        reviewService.submit(userId, request.getDescription(), request.getRating()))));
    }

    /**
     * GET /reviews
     * List all reviews (public).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> findAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(reviewService.findAll(pageable)
                        .map(reviewMapper::toReviewResponse))));
    }

    /**
     * DELETE /reviews/{id}
     * Delete own review.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteOwn(@PathVariable Integer id) {
        Integer userId = SecurityUtils.getCurrentUserId();
        reviewService.delete(id, userId, false);
        return ResponseEntity.ok(ApiResponse.noContent("Review deleted"));
    }

}

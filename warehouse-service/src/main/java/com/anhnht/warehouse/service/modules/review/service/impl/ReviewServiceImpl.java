package com.anhnht.warehouse.service.modules.review.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.ForbiddenException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.review.entity.Review;
import com.anhnht.warehouse.service.modules.review.repository.ReviewRepository;
import com.anhnht.warehouse.service.modules.review.service.ReviewService;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository   userRepository;

    @Override
    @Transactional
    public Review submit(Integer userId, String description, Integer rating) {
        Review review = new Review();
        userRepository.findById(userId).ifPresent(review::setUser);
        review.setDescription(description);
        review.setRating(rating);
        return reviewRepository.save(review);
    }

    @Override
    public Page<Review> findAll(Pageable pageable) {
        return reviewRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public void delete(Integer reviewId, Integer requesterId, boolean isAdmin) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND,
                        "Review not found: " + reviewId));

        boolean isOwner = review.getUser() != null
                && review.getUser().getUserId().equals(requesterId);

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }

        reviewRepository.delete(review);
    }
}

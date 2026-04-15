package com.anhnht.warehouse.service.modules.review.repository;

import com.anhnht.warehouse.service.modules.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Integer> {

    @EntityGraph(attributePaths = {"user"})
    Page<Review> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    Page<Review> findByUserUserId(Integer userId, Pageable pageable);
}

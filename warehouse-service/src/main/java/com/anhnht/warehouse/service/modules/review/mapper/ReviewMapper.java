package com.anhnht.warehouse.service.modules.review.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.review.dto.response.ReviewResponse;
import com.anhnht.warehouse.service.modules.review.entity.Review;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CommonMapperConfig.class)
public interface ReviewMapper {

    @Mapping(source = "user.userId",   target = "userId")
    @Mapping(source = "user.fullName", target = "userName")
    ReviewResponse toReviewResponse(Review review);
}

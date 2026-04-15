package com.anhnht.warehouse.service.modules.user.repository;

import com.anhnht.warehouse.service.modules.user.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Integer> {

    Optional<UserProfile> findByUserUserId(Integer userId);
}

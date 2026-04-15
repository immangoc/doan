package com.anhnht.warehouse.service.modules.user.repository;

import com.anhnht.warehouse.service.modules.user.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAddressRepository extends JpaRepository<UserAddress, Integer> {

    List<UserAddress> findAllByUserUserId(Integer userId);

    Optional<UserAddress> findByAddressIdAndUserUserId(Integer addressId, Integer userId);

    void deleteByAddressIdAndUserUserId(Integer addressId, Integer userId);

    // Reset all addresses of user to non-default before setting a new default
    List<UserAddress> findAllByUserUserIdAndIsDefault(Integer userId, Boolean isDefault);
}

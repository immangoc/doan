package com.anhnht.warehouse.service.modules.user.service;

import com.anhnht.warehouse.service.modules.auth.dto.request.RegisterRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.CreateUserRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.UpdateProfileRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.UpdateUserRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.UserAddressRequest;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.entity.UserAddress;
import com.anhnht.warehouse.service.modules.user.entity.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserService {

    // Lookups
    User findById(Integer userId);
    User findByUsername(String username);
    User findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // Create
    User createCustomer(RegisterRequest request);        // used by AuthFacade on register
    User createUser(CreateUserRequest request);          // admin: any role

    // Update
    User updateUser(Integer userId, UpdateUserRequest request);
    void updateStatus(Integer userId, Integer status);
    void assignRole(Integer userId, Integer roleId);

    // List
    Page<User> findAll(Pageable pageable);

    // Profile
    UserProfile getOrCreateProfile(Integer userId);
    UserProfile updateProfile(Integer userId, UpdateProfileRequest request);

    // Addresses
    List<UserAddress> getAddresses(Integer userId);
    UserAddress addAddress(Integer userId, UserAddressRequest request);
    UserAddress updateAddress(Integer userId, Integer addressId, UserAddressRequest request);
    void deleteAddress(Integer userId, Integer addressId);
}

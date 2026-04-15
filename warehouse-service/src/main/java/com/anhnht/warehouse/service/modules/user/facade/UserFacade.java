package com.anhnht.warehouse.service.modules.user.facade;

import com.anhnht.warehouse.service.modules.user.dto.request.*;
import com.anhnht.warehouse.service.modules.user.dto.response.*;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.mapper.UserMapper;
import com.anhnht.warehouse.service.modules.user.service.SystemLogService;
import com.anhnht.warehouse.service.modules.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class UserFacade {

    private final UserService     userService;
    private final UserMapper      userMapper;
    private final SystemLogService systemLogService;

    // ---- Own profile ----

    public UserDetailResponse getMe(Integer userId) {
        User user = userService.findById(userId);
        UserDetailResponse response = userMapper.toUserDetailResponse(user);
        response.setProfile(userMapper.toUserProfileResponse(userService.getOrCreateProfile(userId)));
        response.setAddresses(userMapper.toUserAddressResponses(userService.getAddresses(userId)));
        return response;
    }

    public UserDetailResponse updateMe(Integer userId, UpdateUserRequest request) {
        User updated = userService.updateUser(userId, request);
        systemLogService.log(userId, "UPDATE_PROFILE", "User updated own profile");
        return getMe(updated.getUserId());
    }

    public UserProfileResponse updateMyProfile(Integer userId, UpdateProfileRequest request) {
        return userMapper.toUserProfileResponse(userService.updateProfile(userId, request));
    }

    public List<UserAddressResponse> getMyAddresses(Integer userId) {
        return userMapper.toUserAddressResponses(userService.getAddresses(userId));
    }

    public UserAddressResponse addMyAddress(Integer userId, UserAddressRequest request) {
        return userMapper.toUserAddressResponse(userService.addAddress(userId, request));
    }

    public UserAddressResponse updateMyAddress(Integer userId, Integer addressId, UserAddressRequest request) {
        return userMapper.toUserAddressResponse(userService.updateAddress(userId, addressId, request));
    }

    public void deleteMyAddress(Integer userId, Integer addressId) {
        userService.deleteAddress(userId, addressId);
    }

    // ---- Admin user management ----

    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userService.findAll(pageable).map(userMapper::toUserResponse);
    }

    public UserDetailResponse getUserById(Integer userId) {
        User user = userService.findById(userId);
        UserDetailResponse response = userMapper.toUserDetailResponse(user);
        response.setProfile(userMapper.toUserProfileResponse(userService.getOrCreateProfile(userId)));
        response.setAddresses(userMapper.toUserAddressResponses(userService.getAddresses(userId)));
        return response;
    }

    public UserResponse createUser(CreateUserRequest request) {
        User user = userService.createUser(request);
        systemLogService.log(null, "ADMIN_CREATE_USER", "Admin created user: " + user.getUsername());
        return userMapper.toUserResponse(user);
    }

    public UserResponse updateUser(Integer userId, UpdateUserRequest request) {
        User updated = userService.updateUser(userId, request);
        systemLogService.log(null, "ADMIN_UPDATE_USER", "Admin updated user: " + userId);
        return userMapper.toUserResponse(updated);
    }

    public void updateUserStatus(Integer userId, Integer status) {
        userService.updateStatus(userId, status);
        systemLogService.log(null, "ADMIN_UPDATE_STATUS",
                "Admin set user " + userId + " status to " + status);
    }

    public void assignRole(Integer userId, Integer roleId) {
        userService.assignRole(userId, roleId);
        systemLogService.log(null, "ADMIN_ASSIGN_ROLE",
                "Admin assigned role " + roleId + " to user " + userId);
    }
}

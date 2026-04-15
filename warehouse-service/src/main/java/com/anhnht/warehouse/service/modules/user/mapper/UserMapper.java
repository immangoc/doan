package com.anhnht.warehouse.service.modules.user.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.user.dto.response.*;
import com.anhnht.warehouse.service.modules.user.entity.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface UserMapper {

    UserResponse toUserResponse(User user);

    // profile and addresses are lazy — they are set explicitly by the facade after mapping
    @Mapping(target = "profile",   ignore = true)
    @Mapping(target = "addresses", ignore = true)
    UserDetailResponse toUserDetailResponse(User user);

    RoleResponse toRoleResponse(Role role);

    PermissionResponse toPermissionResponse(Permission permission);

    List<PermissionResponse> toPermissionResponses(java.util.Collection<Permission> permissions);

    UserProfileResponse toUserProfileResponse(UserProfile profile);

    UserAddressResponse toUserAddressResponse(UserAddress address);

    List<UserAddressResponse> toUserAddressResponses(List<UserAddress> addresses);

    @Mapping(source = "user.userId",   target = "userId")
    @Mapping(source = "user.username", target = "username")
    SystemLogResponse toSystemLogResponse(SystemLog systemLog);
}

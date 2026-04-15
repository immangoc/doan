package com.anhnht.warehouse.service.modules.user.service;

import com.anhnht.warehouse.service.modules.user.entity.Permission;

import java.util.List;

public interface PermissionService {

    List<Permission> findAll();

    Permission findById(Integer permissionId);
}

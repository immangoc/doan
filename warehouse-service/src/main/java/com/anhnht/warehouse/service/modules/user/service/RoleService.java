package com.anhnht.warehouse.service.modules.user.service;

import com.anhnht.warehouse.service.modules.user.entity.Role;

import java.util.List;

public interface RoleService {

    List<Role> findAll();

    Role findById(Integer roleId);

    Role findByName(String roleName);

    Role create(String roleName);

    Role update(Integer roleId, String roleName);

    void delete(Integer roleId);
}

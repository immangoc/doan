package com.anhnht.warehouse.service.modules.user.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.user.entity.Role;
import com.anhnht.warehouse.service.modules.user.repository.RoleRepository;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import com.anhnht.warehouse.service.modules.user.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @Override
    public List<Role> findAll() {
        return roleRepository.findAll();
    }

    @Override
    public Role findById(Integer roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Role not found: " + roleId));
    }

    @Override
    public Role findByName(String roleName) {
        return roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Role not found: " + roleName));
    }

    @Override
    @Transactional
    public Role create(String roleName) {
        if (roleRepository.existsByRoleName(roleName)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Role already exists: " + roleName);
        }
        return roleRepository.save(new Role(roleName));
    }

    @Override
    @Transactional
    public Role update(Integer roleId, String roleName) {
        Role role = findById(roleId);
        role.setRoleName(roleName);
        return roleRepository.save(role);
    }

    @Override
    @Transactional
    public void delete(Integer roleId) {
        Role role = findById(roleId);
        long usersWithRole = userRepository.countByRolesRoleId(roleId);
        if (usersWithRole > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Không thể xóa role '" + role.getRoleName() + "' vì đang được gán cho " + usersWithRole + " người dùng.");
        }
        roleRepository.delete(role);
    }
}

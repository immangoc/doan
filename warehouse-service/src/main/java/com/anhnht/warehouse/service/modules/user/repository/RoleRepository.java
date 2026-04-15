package com.anhnht.warehouse.service.modules.user.repository;

import com.anhnht.warehouse.service.modules.user.entity.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Integer> {

    Optional<Role> findByRoleName(String roleName);

    boolean existsByRoleName(String roleName);

    @EntityGraph(attributePaths = {"permissions"})
    List<Role> findAll();
}

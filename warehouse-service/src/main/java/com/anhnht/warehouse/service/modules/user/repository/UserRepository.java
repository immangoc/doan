package com.anhnht.warehouse.service.modules.user.repository;

import com.anhnht.warehouse.service.modules.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    @EntityGraph(attributePaths = {"roles"})
    Optional<User> findByUsername(String username);

    @EntityGraph(attributePaths = {"roles"})
    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {"roles"})
    @Query(value = "SELECT u FROM User u",
           countQuery = "SELECT COUNT(u) FROM User u")
    Page<User> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"roles"})
    Optional<User> findById(Integer userId);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.roleName = :roleName")
    Page<User> findAllByRoleName(@Param("roleName") String roleName, Pageable pageable);

    @EntityGraph(attributePaths = {"roles"})
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.roleName = :roleName AND " +
           "(:keyword = '' OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<User> findByRoleNameAndKeyword(@Param("roleName") String roleName,
                                        @Param("keyword") String keyword,
                                        Pageable pageable);
}

package com.anhnht.warehouse.service.common.security;

import com.anhnht.warehouse.service.common.constant.RoleCode;
import com.anhnht.warehouse.service.modules.user.entity.Role;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        String role        = resolvePrimaryRole(user.getRoles());
        var    authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));

        return new CustomUserDetails(
                user.getUserId(),
                user.getUsername(),
                user.getPassword(),
                user.getEmail(),
                user.getStatus() == 1,
                authorities
        );
    }

    private String resolvePrimaryRole(Set<Role> roles) {
        var roleNames = roles.stream().map(Role::getRoleName).toList();
        if (roleNames.contains(RoleCode.ADMIN))    return RoleCode.ADMIN;
        if (roleNames.contains(RoleCode.OPERATOR)) return RoleCode.OPERATOR;
        return RoleCode.CUSTOMER;
    }
}

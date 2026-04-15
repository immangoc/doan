package com.anhnht.warehouse.service.common.config;

import com.anhnht.warehouse.service.modules.user.entity.Role;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.user.entity.UserProfile;
import com.anhnht.warehouse.service.modules.user.repository.RoleRepository;
import com.anhnht.warehouse.service.modules.user.repository.UserProfileRepository;
import com.anhnht.warehouse.service.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the default admin account on first startup if it does not already exist.
 * Idempotent — safe to run on every boot.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminDataInitializer implements CommandLineRunner {

    private static final String ADMIN_EMAIL    = "admin@warehouse.local";
    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD = "admin123";
    private static final String ADMIN_FULLNAME = "System Administrator";
    private static final String ADMIN_ROLE     = "ADMIN";

    private final UserRepository        userRepository;
    private final RoleRepository        roleRepository;
    private final UserProfileRepository profileRepository;
    private final PasswordEncoder       passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.existsByEmail(ADMIN_EMAIL)) {
            log.debug("Admin account already exists — skipping initialization");
            return;
        }

        Role role = roleRepository.findByRoleName(ADMIN_ROLE)
                .orElseGet(() -> {
                    Role r = new Role();
                    r.setRoleName(ADMIN_ROLE);
                    return roleRepository.save(r);
                });

        User admin = new User();
        admin.setUsername(ADMIN_USERNAME);
        admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
        admin.setFullName(ADMIN_FULLNAME);
        admin.setEmail(ADMIN_EMAIL);
        admin.setStatus(1);
        admin.getRoles().add(role);

        User saved = userRepository.save(admin);
        profileRepository.save(new UserProfile(saved));
        log.info("AdminDataInitializer: created default admin account ({})", ADMIN_EMAIL);
    }
}

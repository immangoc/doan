package com.anhnht.warehouse.service.modules.user.service.impl;

import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.constant.RoleCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.common.exception.ResourceNotFoundException;
import com.anhnht.warehouse.service.modules.auth.dto.request.RegisterRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.CreateUserRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.UpdateProfileRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.UpdateUserRequest;
import com.anhnht.warehouse.service.modules.user.dto.request.UserAddressRequest;
import com.anhnht.warehouse.service.modules.user.entity.*;
import com.anhnht.warehouse.service.modules.user.repository.*;
import com.anhnht.warehouse.service.modules.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository        userRepository;
    private final RoleRepository        roleRepository;
    private final UserProfileRepository profileRepository;
    private final UserAddressRepository addressRepository;
    private final PasswordEncoder       passwordEncoder;

    // ---- Lookups ----

    @Override
    public User findById(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.USER_NOT_FOUND, "No user found with email: " + email));
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    // ---- Create ----

    @Override
    @Transactional
    public User createCustomer(RegisterRequest request) {
        // Auto-generate username from email prefix if not provided
        String username = StringUtils.hasText(request.getUsername())
                ? request.getUsername()
                : resolveUniqueUsername(request.getEmail().split("@")[0]);

        if (userRepository.existsByUsername(username)) {
            throw new BusinessException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStatus(1);

        Role customerRole = roleRepository.findByRoleName(RoleCode.CUSTOMER)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "CUSTOMER role not seeded"));
        user.getRoles().add(customerRole);

        User saved = userRepository.save(user);

        // Create empty profile
        profileRepository.save(new UserProfile(saved));

        return saved;
    }

    @Override
    @Transactional
    public User createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        Role role = roleRepository.findByRoleName(request.getRoleName())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND,
                        "Role not found: " + request.getRoleName()));

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStatus(1);
        user.getRoles().add(role);

        User saved = userRepository.save(user);
        profileRepository.save(new UserProfile(saved));
        return saved;
    }

    // ---- Update ----

    @Override
    @Transactional
    public User updateUser(Integer userId, UpdateUserRequest request) {
        User user = findById(userId);

        if (StringUtils.hasText(request.getFullName())) user.setFullName(request.getFullName());
        if (StringUtils.hasText(request.getPhone()))    user.setPhone(request.getPhone());
        if (StringUtils.hasText(request.getEmail())) {
            if (!request.getEmail().equals(user.getEmail())
                    && userRepository.existsByEmail(request.getEmail())) {
                throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(request.getEmail());
        }

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void updateStatus(Integer userId, Integer status) {
        User user = findById(userId);
        user.setStatus(status);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void assignRole(Integer userId, Integer roleId) {
        User user = findById(userId);
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Role not found: " + roleId));
        user.getRoles().clear();
        user.getRoles().add(role);
        userRepository.save(user);
    }

    // ---- List ----

    @Override
    public Page<User> findAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    // ---- Profile ----

    @Override
    @Transactional
    public UserProfile getOrCreateProfile(Integer userId) {
        return profileRepository.findByUserUserId(userId)
                .orElseGet(() -> {
                    User user = findById(userId);
                    return profileRepository.save(new UserProfile(user));
                });
    }

    @Override
    @Transactional
    public UserProfile updateProfile(Integer userId, UpdateProfileRequest request) {
        UserProfile profile = getOrCreateProfile(userId);

        if (request.getGender()      != null) profile.setGender(request.getGender());
        if (request.getDateOfBirth() != null) profile.setDateOfBirth(request.getDateOfBirth());
        if (request.getNationalId()  != null) profile.setNationalId(request.getNationalId());

        return profileRepository.save(profile);
    }

    // ---- Addresses ----

    @Override
    public List<UserAddress> getAddresses(Integer userId) {
        return addressRepository.findAllByUserUserId(userId);
    }

    @Override
    @Transactional
    public UserAddress addAddress(Integer userId, UserAddressRequest request) {
        User user = findById(userId);

        if (Boolean.TRUE.equals(request.getIsDefault())) {
            clearDefaultAddresses(userId);
        }

        UserAddress addr = new UserAddress();
        addr.setUser(user);
        addr.setAddress(request.getAddress());
        addr.setWard(request.getWard());
        addr.setDistrict(request.getDistrict());
        addr.setCity(request.getCity());
        addr.setIsDefault(Boolean.TRUE.equals(request.getIsDefault()));

        return addressRepository.save(addr);
    }

    @Override
    @Transactional
    public UserAddress updateAddress(Integer userId, Integer addressId, UserAddressRequest request) {
        UserAddress addr = addressRepository.findByAddressIdAndUserUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Address not found: " + addressId));

        if (Boolean.TRUE.equals(request.getIsDefault()) && !Boolean.TRUE.equals(addr.getIsDefault())) {
            clearDefaultAddresses(userId);
        }

        if (request.getAddress()  != null) addr.setAddress(request.getAddress());
        if (request.getWard()     != null) addr.setWard(request.getWard());
        if (request.getDistrict() != null) addr.setDistrict(request.getDistrict());
        if (request.getCity()     != null) addr.setCity(request.getCity());
        if (request.getIsDefault() != null) addr.setIsDefault(request.getIsDefault());

        return addressRepository.save(addr);
    }

    @Override
    @Transactional
    public void deleteAddress(Integer userId, Integer addressId) {
        addressRepository.findByAddressIdAndUserUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOT_FOUND, "Address not found: " + addressId));
        addressRepository.deleteByAddressIdAndUserUserId(addressId, userId);
    }

    // ---- Private helpers ----

    private String resolveUniqueUsername(String base) {
        // Sanitise: keep alphanumeric + underscore, max 40 chars
        String clean = base.replaceAll("[^a-zA-Z0-9_]", "_");
        if (clean.length() > 40) clean = clean.substring(0, 40);
        if (!userRepository.existsByUsername(clean)) return clean;
        // Append incrementing suffix until unique
        for (int i = 2; i <= 9999; i++) {
            String candidate = clean + "_" + i;
            if (!userRepository.existsByUsername(candidate)) return candidate;
        }
        return clean + "_" + System.currentTimeMillis();
    }

    private void clearDefaultAddresses(Integer userId) {
        addressRepository.findAllByUserUserIdAndIsDefault(userId, true)
                .forEach(a -> {
                    a.setIsDefault(false);
                    addressRepository.save(a);
                });
    }
}

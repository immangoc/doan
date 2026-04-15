package com.anhnht.warehouse.service.common.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Integer userId;
    private final String  username;
    private final String  password;
    private final String  email;
    private final boolean enabled;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(Integer userId, String username, String password,
                             String email, boolean enabled,
                             Collection<? extends GrantedAuthority> authorities) {
        this.userId      = userId;
        this.username    = username;
        this.password    = password;
        this.email       = email;
        this.enabled     = enabled;
        this.authorities = authorities;
    }

    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return enabled; }
    @Override public boolean isCredentialsNonExpired() { return true; }
}

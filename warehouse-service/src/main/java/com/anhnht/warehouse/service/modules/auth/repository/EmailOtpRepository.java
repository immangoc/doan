package com.anhnht.warehouse.service.modules.auth.repository;

import com.anhnht.warehouse.service.modules.auth.entity.EmailOtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtpToken, Integer> {

    @Query("SELECT t FROM EmailOtpToken t WHERE t.email = :email AND t.used = false ORDER BY t.createdAt DESC LIMIT 1")
    Optional<EmailOtpToken> findLatestByEmail(String email);

    @Modifying
    @Query("DELETE FROM EmailOtpToken t WHERE t.email = :email")
    void deleteByEmail(String email);
}

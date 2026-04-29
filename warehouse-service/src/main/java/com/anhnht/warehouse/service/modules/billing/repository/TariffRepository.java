package com.anhnht.warehouse.service.modules.billing.repository;

import com.anhnht.warehouse.service.modules.billing.entity.Tariff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TariffRepository extends JpaRepository<Tariff, Integer> {
    Optional<Tariff> findByTariffCode(String tariffCode);
    List<Tariff> findByTariffCodeIn(Collection<String> tariffCodes);
}

package com.anhnht.warehouse.service.modules.billing.service.impl;

import com.anhnht.warehouse.service.modules.billing.dto.request.FeeConfigRequest;
import com.anhnht.warehouse.service.modules.billing.entity.FeeConfig;
import com.anhnht.warehouse.service.modules.billing.repository.FeeConfigRepository;
import com.anhnht.warehouse.service.modules.billing.service.FeeConfigService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeeConfigServiceImpl implements FeeConfigService {

    private final FeeConfigRepository repository;
    private final ObjectMapper         objectMapper;

    @Override
    public FeeConfig get() {
        // Always returns the single config row (seeded in V6 migration)
        return repository.findAll().stream()
                .findFirst()
                .orElseGet(() -> {
                    FeeConfig defaultConfig = new FeeConfig();
                    return repository.save(defaultConfig);
                });
    }

    @Override
    @Transactional
    public FeeConfig update(FeeConfigRequest request) {
        FeeConfig config = get();

        if (StringUtils.hasText(request.getCurrency()))       config.setCurrency(request.getCurrency());
        if (request.getCostRate()        != null)              config.setCostRate(request.getCostRate());
        if (request.getRatePerKgDefault() != null)             config.setRatePerKgDefault(request.getRatePerKgDefault());

        if (request.getRatePerKgByCargoType() != null) {
            try {
                config.setRatePerKgByType(
                        objectMapper.writeValueAsString(request.getRatePerKgByCargoType()));
            } catch (JsonProcessingException e) {
                config.setRatePerKgByType("{}");
            }
        }

        config.setUpdatedAt(LocalDateTime.now());
        return repository.save(config);
    }

    /** Parses the stored JSON text into a Map for the response DTO. */
    public Map<String, Double> parseRates(String json) {
        if (!StringUtils.hasText(json)) return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return new HashMap<>();
        }
    }
}

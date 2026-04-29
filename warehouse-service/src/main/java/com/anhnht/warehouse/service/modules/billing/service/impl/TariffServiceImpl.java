package com.anhnht.warehouse.service.modules.billing.service.impl;

import com.anhnht.warehouse.service.modules.billing.dto.request.TariffRequest;
import com.anhnht.warehouse.service.modules.billing.entity.Tariff;
import com.anhnht.warehouse.service.modules.billing.repository.TariffRepository;
import com.anhnht.warehouse.service.modules.billing.service.TariffService;
import com.anhnht.warehouse.service.modules.container.entity.CargoType;
import com.anhnht.warehouse.service.modules.container.repository.CargoTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TariffServiceImpl implements TariffService {

    private final TariffRepository tariffRepository;
    private final CargoTypeRepository cargoTypeRepository;

    @Override
    public List<Tariff> getAll() {
        return tariffRepository.findAll(Sort.by("tariffId"));
    }

    @Override
    @Transactional
    public List<Tariff> upsert(List<TariffRequest> requests) {
        List<Tariff> saved = new ArrayList<>();
        if (requests == null) return saved;

        for (TariffRequest req : requests) {
            if (!StringUtils.hasText(req.getTariffCode())) continue;

            Tariff tariff = tariffRepository.findByTariffCode(req.getTariffCode())
                    .orElseGet(Tariff::new);

            tariff.setTariffCode(req.getTariffCode());
            if (StringUtils.hasText(req.getTariffName())) {
                tariff.setTariffName(req.getTariffName());
            }
            if (StringUtils.hasText(req.getFeeType())) {
                tariff.setFeeType(req.getFeeType());
            }
            if (StringUtils.hasText(req.getUnit())) {
                tariff.setUnit(req.getUnit());
            }

            tariff.setContainerSize(req.getContainerSize());
            if (req.getUnitPrice() != null) {
                tariff.setUnitPrice(req.getUnitPrice());
            }
            tariff.setNote(req.getNote());

            if (req.getEffectiveDate() != null) {
                tariff.setEffectiveDate(req.getEffectiveDate());
            } else if (tariff.getEffectiveDate() == null) {
                tariff.setEffectiveDate(LocalDate.now());
            }

            if (StringUtils.hasText(req.getCargoTypeName())) {
                CargoType cargoType = cargoTypeRepository.findByCargoTypeName(req.getCargoTypeName())
                        .orElseGet(() -> cargoTypeRepository.save(new CargoType(req.getCargoTypeName())));
                tariff.setCargoType(cargoType);
            } else {
                tariff.setCargoType(null);
            }

            saved.add(tariffRepository.save(tariff));
        }

        return saved;
    }
}

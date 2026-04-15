package com.anhnht.warehouse.service.modules.vessel.repository;

import com.anhnht.warehouse.service.modules.vessel.entity.Vessel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VesselRepository extends JpaRepository<Vessel, Integer> {

    @Query(value = "SELECT v FROM Vessel v WHERE " +
                   "(:keyword = '' OR LOWER(v.vesselName) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
                   "OR LOWER(v.shippingLine) LIKE LOWER(CONCAT('%',:keyword,'%')))",
           countQuery = "SELECT COUNT(v) FROM Vessel v WHERE " +
                        "(:keyword = '' OR LOWER(v.vesselName) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
                        "OR LOWER(v.shippingLine) LIKE LOWER(CONCAT('%',:keyword,'%')))")
    Page<Vessel> search(@Param("keyword") String keyword, Pageable pageable);
}

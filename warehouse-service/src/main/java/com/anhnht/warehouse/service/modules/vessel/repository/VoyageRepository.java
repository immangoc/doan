package com.anhnht.warehouse.service.modules.vessel.repository;

import com.anhnht.warehouse.service.modules.vessel.entity.Voyage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VoyageRepository extends JpaRepository<Voyage, Integer> {

    @EntityGraph(attributePaths = {"vessel"})
    Optional<Voyage> findById(Integer voyageId);

    @EntityGraph(attributePaths = {"vessel"})
    Page<Voyage> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"vessel"})
    List<Voyage> findAllByVesselVesselId(Integer vesselId);

    @Query("SELECT v FROM Voyage v JOIN FETCH v.vessel " +
           "WHERE v.actualTimeArrival IS NULL ORDER BY v.estimatedTimeArrival ASC")
    List<Voyage> findUpcomingVoyages();
}

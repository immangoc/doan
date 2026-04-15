package com.anhnht.warehouse.service.modules.vessel.repository;

import com.anhnht.warehouse.service.modules.vessel.entity.Manifest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ManifestRepository extends JpaRepository<Manifest, Integer> {

    @EntityGraph(attributePaths = {"voyage", "voyage.vessel"})
    List<Manifest> findAllByVoyageVoyageId(Integer voyageId);

    @EntityGraph(attributePaths = {"voyage", "voyage.vessel"})
    Optional<Manifest> findById(Integer manifestId);
}

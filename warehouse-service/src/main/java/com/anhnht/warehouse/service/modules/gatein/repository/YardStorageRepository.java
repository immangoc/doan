package com.anhnht.warehouse.service.modules.gatein.repository;

import com.anhnht.warehouse.service.modules.gatein.entity.YardStorage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface YardStorageRepository extends JpaRepository<YardStorage, Integer> {

    @EntityGraph(attributePaths = {"yard"})
    @Query("SELECT s FROM YardStorage s WHERE s.container.containerId = :containerId ORDER BY s.storageStartDate DESC")
    List<YardStorage> findByContainerIdOrdered(@Param("containerId") String containerId);

    /** Active storage record (no end date). */
    @EntityGraph(attributePaths = {"yard"})
    @Query("SELECT s FROM YardStorage s WHERE s.container.containerId = :containerId AND s.storageEndDate IS NULL")
    Optional<YardStorage> findActiveByContainerId(@Param("containerId") String containerId);

    /** Batch: latest expected exit date per container ID. Returns [containerId, storageEndDate]. */
    @Query("SELECT s.container.containerId, MAX(s.storageEndDate) FROM YardStorage s " +
           "WHERE s.container.containerId IN :containerIds AND s.storageEndDate IS NOT NULL " +
           "GROUP BY s.container.containerId")
    List<Object[]> findExpectedExitDates(@Param("containerIds") List<String> containerIds);

    /** Scheduler: storage records with expected exit date on or before cutoff (service filters by container status). */
    @EntityGraph(attributePaths = {"container", "container.status", "yard"})
    @Query("SELECT s FROM YardStorage s WHERE s.storageEndDate IS NOT NULL AND s.storageEndDate <= :cutoff")
    List<YardStorage> findWithExitOnOrBefore(@Param("cutoff") LocalDate cutoff);

    /**
     * Customer dashboard: near-expiry records scoped to a specific set of container IDs.
     * Returns storage records whose expected exit date is on or before cutoff AND
     * whose container ID is in the provided list.
     */
    @EntityGraph(attributePaths = {"container", "container.status"})
    @Query("SELECT s FROM YardStorage s " +
           "WHERE s.storageEndDate IS NOT NULL " +
           "  AND s.storageEndDate <= :cutoff " +
           "  AND s.container.containerId IN :containerIds")
    List<YardStorage> findWithExitOnOrBeforeForContainers(
            @Param("cutoff") LocalDate cutoff,
            @Param("containerIds") List<String> containerIds);

    /** Algorithm: expected exit date for a container (earliest non-null end date). */
    @Query("SELECT s.storageEndDate FROM YardStorage s " +
           "WHERE s.container.containerId = :containerId AND s.storageEndDate IS NOT NULL " +
           "ORDER BY s.storageEndDate ASC")
    Optional<LocalDate> findExpectedExitDate(@Param("containerId") String containerId);

    /** Scheduler: active storage records where container has been stored since before
     *  cutoffDate (i.e. ≥ LONG_STORAGE_DAYS days). Container must still be in yard. */
    @EntityGraph(attributePaths = {"container", "container.status", "container.owner", "yard"})
    @Query("SELECT s FROM YardStorage s " +
           "WHERE s.storageStartDate IS NOT NULL AND s.storageStartDate <= :cutoffDate " +
           "  AND s.container.status.statusName IN ('IN_YARD', 'GATE_IN')")
    List<YardStorage> findLongStorageContainers(@Param("cutoffDate") LocalDate cutoffDate);
}

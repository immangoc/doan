package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ContainerRepository extends JpaRepository<Container, String> {

    long countByStatusStatusName(String statusName);

    /** Dashboard/Report: count containers grouped by status name. Returns [statusName, count]. */
    @Query("SELECT c.status.statusName, COUNT(c) FROM Container c GROUP BY c.status.statusName")
    List<Object[]> countGroupedByStatus();

    /** Report: count containers grouped by cargo type name. Returns [cargoTypeName, count]. */
    @Query("SELECT c.cargoType.cargoTypeName, COUNT(c) FROM Container c WHERE c.cargoType IS NOT NULL GROUP BY c.cargoType.cargoTypeName")
    List<Object[]> countGroupedByCargoType();

    /** Report: count containers grouped by container type name. Returns [containerTypeName, count]. */
    @Query("SELECT c.containerType.containerTypeName, COUNT(c) FROM Container c WHERE c.containerType IS NOT NULL GROUP BY c.containerType.containerTypeName")
    List<Object[]> countGroupedByContainerType();


    @EntityGraph(attributePaths = {"containerType", "status", "cargoType", "attribute", "manifest"})
    @Query(value = "SELECT c FROM Container c WHERE " +
                   "(:keyword = '' OR LOWER(c.containerId) LIKE LOWER(CONCAT('%',:keyword,'%'))) AND " +
                   "(:statusName = '' OR c.status.statusName = :statusName) AND " +
                   "(:yardName = '' OR EXISTS (" +
                   "  SELECT 1 FROM ContainerPosition cp WHERE cp.container.containerId = c.containerId " +
                   "  AND cp.slot.block.zone.yard.yardName = :yardName))",
           countQuery = "SELECT COUNT(c) FROM Container c WHERE " +
                        "(:keyword = '' OR LOWER(c.containerId) LIKE LOWER(CONCAT('%',:keyword,'%'))) AND " +
                        "(:statusName = '' OR c.status.statusName = :statusName) AND " +
                        "(:yardName = '' OR EXISTS (" +
                        "  SELECT 1 FROM ContainerPosition cp WHERE cp.container.containerId = c.containerId " +
                        "  AND cp.slot.block.zone.yard.yardName = :yardName))")
    Page<Container> search(@Param("keyword") String keyword,
                           @Param("statusName") String statusName,
                           @Param("yardName") String yardName,
                           Pageable pageable);

    @EntityGraph(attributePaths = {"containerType", "status", "cargoType", "attribute", "manifest"})
    @Query("SELECT c FROM Container c WHERE c.containerId = :id")
    java.util.Optional<Container> findByIdWithDetails(@Param("id") String id);

    /** Customer: find all containers owned by this customer. */
    @EntityGraph(attributePaths = {"containerType", "status", "cargoType", "attribute"})
    @Query(value = "SELECT c FROM Container c WHERE c.owner.userId = :customerId",
           countQuery = "SELECT COUNT(c) FROM Container c WHERE c.owner.userId = :customerId")
    Page<Container> findByCustomerUserId(@Param("customerId") Integer customerId, Pageable pageable);

    /**
     * Customer: containers owned by this customer NOT in any active order.
     * exceptOrderId = -1 means no exception (used for create).
     * Pass a real orderId to also allow containers already in that specific order (used for edit).
     */
    @EntityGraph(attributePaths = {"containerType", "status", "cargoType", "attribute"})
    @Query(value =
        "SELECT DISTINCT c FROM Container c WHERE c.owner.userId = :customerId " +
        "AND c.containerId NOT IN (" +
        "  SELECT c2.containerId FROM Order o JOIN o.containers c2 " +
        "  WHERE o.status.statusName NOT IN :terminalStatuses " +
        "  AND (:exceptOrderId = -1 OR o.orderId <> :exceptOrderId)" +
        ")",
           countQuery =
        "SELECT COUNT(DISTINCT c) FROM Container c WHERE c.owner.userId = :customerId " +
        "AND c.containerId NOT IN (" +
        "  SELECT c2.containerId FROM Order o JOIN o.containers c2 " +
        "  WHERE o.status.statusName NOT IN :terminalStatuses " +
        "  AND (:exceptOrderId = -1 OR o.orderId <> :exceptOrderId)" +
        ")")
    Page<Container> findEligibleByOwner(
            @Param("customerId") Integer customerId,
            @Param("terminalStatuses") List<String> terminalStatuses,
            @Param("exceptOrderId") int exceptOrderId,
            Pageable pageable);

    @Query("SELECT COUNT(DISTINCT c) FROM Container c WHERE c.owner.userId = :customerId " +
           "AND c.containerId NOT IN (" +
           "  SELECT c2.containerId FROM Order o JOIN o.containers c2 " +
           "  WHERE o.status.statusName NOT IN :terminalStatuses " +
           "  AND (:exceptOrderId = -1 OR o.orderId <> :exceptOrderId)" +
           ")")
    long countEligibleByOwner(@Param("customerId") Integer customerId,
                              @Param("terminalStatuses") List<String> terminalStatuses,
                              @Param("exceptOrderId") int exceptOrderId);
}

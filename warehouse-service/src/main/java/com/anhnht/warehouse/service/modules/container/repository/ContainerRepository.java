package com.anhnht.warehouse.service.modules.container.repository;

import com.anhnht.warehouse.service.modules.container.entity.Container;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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
                   "(:statusName = '' OR c.status.statusName = :statusName)",
           countQuery = "SELECT COUNT(c) FROM Container c WHERE " +
                        "(:keyword = '' OR LOWER(c.containerId) LIKE LOWER(CONCAT('%',:keyword,'%'))) AND " +
                        "(:statusName = '' OR c.status.statusName = :statusName)")
    Page<Container> search(@Param("keyword") String keyword, @Param("statusName") String statusName, Pageable pageable);

    @EntityGraph(attributePaths = {"containerType", "status", "cargoType", "attribute", "manifest"})
    @Query("SELECT c FROM Container c WHERE c.containerId = :id")
    java.util.Optional<Container> findByIdWithDetails(@Param("id") String id);

    /** Customer: find containers linked to the given customer's orders. */
    @EntityGraph(attributePaths = {"containerType", "status", "cargoType", "attribute"})
    @Query(value = "SELECT DISTINCT c FROM Container c WHERE c.containerId IN " +
                   "(SELECT c2.containerId FROM Order o JOIN o.containers c2 WHERE o.customer.userId = :customerId)",
           countQuery = "SELECT COUNT(DISTINCT c) FROM Container c WHERE c.containerId IN " +
                        "(SELECT c2.containerId FROM Order o JOIN o.containers c2 WHERE o.customer.userId = :customerId)")
    Page<Container> findByCustomerUserId(@Param("customerId") Integer customerId, Pageable pageable);
}

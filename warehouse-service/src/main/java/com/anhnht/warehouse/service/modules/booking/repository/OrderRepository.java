package com.anhnht.warehouse.service.modules.booking.repository;

import com.anhnht.warehouse.service.modules.booking.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    long countByStatusStatusName(String statusName);

    /** Report: count orders grouped by status name. Returns [statusName, count]. */
    @Query("SELECT o.status.statusName, COUNT(o) FROM Order o GROUP BY o.status.statusName")
    List<Object[]> countGroupedByStatus();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt BETWEEN :from AND :to")
    long countByDateRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    long countByCustomerUserId(Integer customerId);

    long countByCustomerUserIdAndStatusStatusName(Integer customerId, String statusName);

    /** Customer dashboard: distinct container IDs that are IN_YARD and belong to this customer's orders. */
    @Query("SELECT DISTINCT c.containerId FROM Order o JOIN o.containers c " +
           "WHERE o.customer.userId = :customerId AND c.status.statusName = 'IN_YARD'")
    List<String> findContainerIdsInYardByCustomerId(@Param("customerId") Integer customerId);

    @EntityGraph(attributePaths = {"customer", "status", "containers"})
    @Query(value = "SELECT DISTINCT o FROM Order o WHERE " +
                   "(:statusName IS NULL OR o.status.statusName = :statusName) AND " +
                   "(:keyword = '' OR LOWER(o.customerName) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
                   "OR LOWER(o.email) LIKE LOWER(CONCAT('%',:keyword,'%')))",
           countQuery = "SELECT COUNT(o) FROM Order o WHERE " +
                        "(:statusName IS NULL OR o.status.statusName = :statusName) AND " +
                        "(:keyword = '' OR LOWER(o.customerName) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
                        "OR LOWER(o.email) LIKE LOWER(CONCAT('%',:keyword,'%')))")
    Page<Order> findAllFiltered(@Param("statusName") String statusName,
                                @Param("keyword") String keyword,
                                Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "status", "containers", "cancellation"})
    @Query("SELECT o FROM Order o WHERE o.orderId = :id")
    Optional<Order> findByIdWithDetails(@Param("id") Integer id);

    @EntityGraph(attributePaths = {"status", "containers"})
    Page<Order> findByCustomerUserId(Integer customerId, Pageable pageable);

    /** Scheduler: find orders with a given status whose importDate is before a cutoff date. */
    @EntityGraph(attributePaths = {"customer", "status"})
    @Query("SELECT o FROM Order o WHERE o.status.statusName = :statusName AND o.importDate < :cutoff")
    List<Order> findByStatusNameAndImportDateBefore(@Param("statusName") String statusName,
                                                    @Param("cutoff") LocalDate cutoff);

    /** Gate-in/Gate-out: find the active order that contains a specific container. */
    @Query("SELECT o FROM Order o JOIN o.containers c WHERE c.containerId = :containerId " +
           "AND o.status.statusName IN :activeStatuses")
    Optional<Order> findActiveOrderByContainerId(@Param("containerId") String containerId,
                                                  @Param("activeStatuses") List<String> activeStatuses);

    /** Validation: count active orders containing this container (excludes terminal statuses). */
    @Query("SELECT COUNT(o) FROM Order o JOIN o.containers c WHERE c.containerId = :containerId " +
           "AND o.status.statusName NOT IN :terminalStatuses")
    long countActiveOrdersForContainer(@Param("containerId") String containerId,
                                       @Param("terminalStatuses") List<String> terminalStatuses);

    /** Batch: return container IDs from the given list that are in at least one active order. */
    @Query("SELECT DISTINCT c.containerId FROM Order o JOIN o.containers c " +
           "WHERE c.containerId IN :containerIds AND o.status.statusName NOT IN :terminalStatuses")
    List<String> findContainerIdsInActiveOrders(@Param("containerIds") List<String> containerIds,
                                                @Param("terminalStatuses") List<String> terminalStatuses);

    /** Hard-delete support: remove a container from ALL orders in order_container join table. */
    @Modifying
    @Query(value = "DELETE FROM order_container WHERE container_id = :containerId", nativeQuery = true)
    void removeContainerFromAllOrders(@Param("containerId") String containerId);

    /** Validation for update: same as above but excludes a specific order (the one being edited). */
    @Query("SELECT COUNT(o) FROM Order o JOIN o.containers c WHERE c.containerId = :containerId " +
           "AND o.status.statusName NOT IN :terminalStatuses AND o.orderId <> :excludeOrderId")
    long countActiveOrdersForContainerExcluding(@Param("containerId") String containerId,
                                                @Param("terminalStatuses") List<String> terminalStatuses,
                                                @Param("excludeOrderId") Integer excludeOrderId);
}

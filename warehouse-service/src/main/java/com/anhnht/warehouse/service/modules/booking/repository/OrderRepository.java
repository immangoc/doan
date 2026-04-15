package com.anhnht.warehouse.service.modules.booking.repository;

import com.anhnht.warehouse.service.modules.booking.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}

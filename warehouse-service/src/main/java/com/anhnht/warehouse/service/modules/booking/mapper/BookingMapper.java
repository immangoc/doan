package com.anhnht.warehouse.service.modules.booking.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.booking.dto.response.BillHistoryResponse;
import com.anhnht.warehouse.service.modules.booking.dto.response.BillOfLadingResponse;
import com.anhnht.warehouse.service.modules.booking.dto.response.OrderCancellationResponse;
import com.anhnht.warehouse.service.modules.booking.dto.response.OrderResponse;
import com.anhnht.warehouse.service.modules.booking.entity.BillOfLading;
import com.anhnht.warehouse.service.modules.booking.entity.BillOfLadingHistory;
import com.anhnht.warehouse.service.modules.booking.entity.Order;
import com.anhnht.warehouse.service.modules.booking.entity.OrderCancellation;
import com.anhnht.warehouse.service.modules.container.entity.Container;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(config = CommonMapperConfig.class)
public interface BookingMapper {

    @Mapping(source = "customer.userId",    target = "customerId")
    @Mapping(source = "status.statusName",  target = "statusName")
    @Mapping(source = "containers",          target = "containerIds", qualifiedByName = "toContainerIds")
    @Mapping(source = "cancellation",        target = "cancellation")
    OrderResponse toOrderResponse(Order order);

    OrderCancellationResponse toOrderCancellationResponse(OrderCancellation cancellation);

    @Mapping(source = "order.orderId",      target = "orderId")
    @Mapping(source = "status.statusName",  target = "statusName")
    BillOfLadingResponse toBillResponse(BillOfLading bill);

    @Mapping(source = "status.statusName",  target = "statusName")
    BillHistoryResponse toBillHistoryResponse(BillOfLadingHistory history);

    List<OrderResponse>      toOrderResponses(List<Order> list);
    List<BillHistoryResponse> toBillHistoryResponses(List<BillOfLadingHistory> list);

    @Named("toContainerIds")
    default Set<String> toContainerIds(Set<Container> containers) {
        if (containers == null) return Set.of();
        return containers.stream()
                .map(Container::getContainerId)
                .collect(Collectors.toSet());
    }

    @AfterMapping
    default void fillTotalWeight(Order order, @MappingTarget OrderResponse response) {
        if (order.getContainers() == null) return;
        BigDecimal total = order.getContainers().stream()
                .filter(c -> c.getGrossWeight() != null)
                .map(Container::getGrossWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        response.setTotalGrossWeight(total.compareTo(BigDecimal.ZERO) == 0 ? null : total);
    }
}

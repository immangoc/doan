package com.anhnht.warehouse.service.infrastructure.kafka;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class KafkaConsumerService {

    @KafkaListener(
            topics      = "${app.kafka.topic.yard-events}",
            groupId     = "warehouse-group"
    )
    public void consumeYardEvent(ConsumerRecord<String, Object> record) {
        log.info("Received yard event: key={}, offset={}, partition={}",
                record.key(), record.offset(), record.partition());
        // Event handlers will be added in Phase 8
    }
}

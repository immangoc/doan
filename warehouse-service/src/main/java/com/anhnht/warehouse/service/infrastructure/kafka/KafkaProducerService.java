package com.anhnht.warehouse.service.infrastructure.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topic.yard-events}")
    private String yardEventsTopic;

    public void publishYardEvent(String eventType, Object payload) {
        try {
            kafkaTemplate.send(yardEventsTopic, eventType, payload);
            log.info("Published yard event: type={}", eventType);
        } catch (Exception e) {
            log.error("Failed to publish yard event type={}: {}", eventType, e.getMessage());
        }
    }
}

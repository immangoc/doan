package com.anhnht.warehouse.service.modules.optimization.ml;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Calls the Python ML microservice (ml_service_app.py) to fetch slot ml_scores.
 * Returns a map of slotId -> mlScore for the candidates the model evaluated.
 * Any failure (timeout, 5xx, parse error, ML disabled) yields an empty Optional
 * so callers can fall back to the heuristic.
 *
 * Implementation note: we read the response as raw byte[] (ByteArrayHttpMessageConverter
 * accepts ANY content type, including the application/octet-stream that uvicorn sometimes
 * emits) and parse with ObjectMapper, sidestepping Spring's content-type negotiation.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MlScoringClient {

    private final RestClient   mlRestClient;
    private final ObjectMapper objectMapper;

    @Value("${ml.service.enabled:true}")
    private boolean enabled;

    public Optional<Map<Integer, Double>> fetchScores(String containerId,
                                                      String cargoTypeName,
                                                      BigDecimal grossWeight,
                                                      String sizeType) {
        if (!enabled) return Optional.empty();
        if (cargoTypeName == null || sizeType == null) return Optional.empty();

        MlPlacementRequest req = MlPlacementRequest.builder()
                .containerId(containerId)
                .cargoTypeName(cargoTypeName)
                .grossWeight(grossWeight)
                .sizeType(sizeType)
                .build();

        try {
            byte[] raw = mlRestClient.post()
                    .uri("/recommend-placement")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(byte[].class);

            if (raw == null || raw.length == 0) return Optional.empty();

            MlPlacementResponse resp = objectMapper.readValue(raw, MlPlacementResponse.class);
            if (resp == null || resp.recommendations() == null) return Optional.empty();

            Map<Integer, Double> scores = new HashMap<>();
            for (var rec : resp.recommendations()) {
                if (rec.slotId() == null || rec.mlScore() == null) continue;
                try {
                    scores.put(Integer.parseInt(rec.slotId()), rec.mlScore());
                } catch (NumberFormatException ignored) {
                    // ML service emits string slotId; non-numeric ids skipped
                }
            }
            log.debug("[ML] {} slots scored by model {}", scores.size(), resp.modelName());
            return scores.isEmpty() ? Optional.empty() : Optional.of(Collections.unmodifiableMap(scores));
        } catch (Exception ex) {
            log.warn("[ML] scoring fallback to heuristic — {}", ex.getMessage());
            return Optional.empty();
        }
    }
}

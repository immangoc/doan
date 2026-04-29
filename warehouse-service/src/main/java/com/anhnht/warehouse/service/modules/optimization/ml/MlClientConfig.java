package com.anhnht.warehouse.service.modules.optimization.ml;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

@Configuration
public class MlClientConfig {

    @Bean
    RestClient mlRestClient(
            @Value("${ml.service.url}") String baseUrl,
            @Value("${ml.service.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${ml.service.read-timeout-ms}") int readTimeoutMs,
            ObjectMapper objectMapper
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        // Một số runtime FastAPI/uvicorn (đặc biệt khi qua reverse proxy) trả về
        // Content-Type=application/octet-stream cho JSON response. Mở rộng Jackson
        // converter để decode cả octet-stream như JSON, tránh fallback heuristic.
        MappingJackson2HttpMessageConverter jackson = new MappingJackson2HttpMessageConverter(objectMapper);
        jackson.setSupportedMediaTypes(List.of(
                MediaType.APPLICATION_JSON,
                MediaType.APPLICATION_OCTET_STREAM,
                MediaType.parseMediaType("application/*+json"),
                MediaType.TEXT_PLAIN
        ));

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .messageConverters(converters -> {
                    converters.removeIf(c -> c instanceof MappingJackson2HttpMessageConverter);
                    converters.add(0, jackson);
                })
                .build();
    }
}

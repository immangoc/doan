package com.anhnht.warehouse.service.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "Bearer Authentication";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("HT Port Logistics API")
                        .description("Warehouse Management System — Hùng Thủy Maritime\n\n"
                                + "Hệ thống quản lý kho bãi cảng biển tích hợp ML.\n\n"
                                + "**Xác thực**: Sử dụng JWT Bearer Token. "
                                + "Gọi `/auth/login` để lấy token, sau đó nhấn nút **Authorize** và nhập `Bearer <token>`.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("AnhNHT")
                                .email("anhnht@example.com")))
                .servers(List.of(
                        new Server().url("http://localhost:8080/api/v1").description("Local Development")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }

    /* ------------------------------------------------------------------ */
    /* Grouped APIs — each group appears as a separate dropdown in the UI */
    /* ------------------------------------------------------------------ */

    @Bean
    public GroupedOpenApi authGroup() {
        return GroupedOpenApi.builder()
                .group("1. Xác thực & Người dùng")
                .pathsToMatch("/auth/**", "/admin/users/**", "/admin/roles/**", "/admin/permissions/**")
                .build();
    }

    @Bean
    public GroupedOpenApi yardGroup() {
        return GroupedOpenApi.builder()
                .group("2. Bãi kho & Container")
                .pathsToMatch("/admin/yards/**", "/admin/yard/**", "/admin/yard-types/**",
                        "/admin/block-types/**", "/admin/zones/**", "/admin/blocks/**",
                        "/admin/slots/**", "/admin/containers/**", "/admin/cargo-types/**")
                .build();
    }

    @Bean
    public GroupedOpenApi gateGroup() {
        return GroupedOpenApi.builder()
                .group("3. Nhập xuất kho")
                .pathsToMatch("/admin/gate-in/**", "/admin/gate-out/**")
                .build();
    }

    @Bean
    public GroupedOpenApi bookingGroup() {
        return GroupedOpenApi.builder()
                .group("4. Đơn hàng & Vận đơn")
                .pathsToMatch("/admin/orders/**", "/orders/**", "/admin/bills-of-lading/**", "/bills-of-lading/**")
                .build();
    }

    @Bean
    public GroupedOpenApi optimizationGroup() {
        return GroupedOpenApi.builder()
                .group("5. ML Tối ưu vị trí")
                .pathsToMatch("/admin/optimization/**", "/admin/damage/**")
                .build();
    }

    @Bean
    public GroupedOpenApi financeGroup() {
        return GroupedOpenApi.builder()
                .group("6. Tài chính")
                .pathsToMatch("/admin/fees/**", "/wallets/**", "/wallet/**")
                .build();
    }

    @Bean
    public GroupedOpenApi vesselGroup() {
        return GroupedOpenApi.builder()
                .group("7. Tàu & Lịch trình")
                .pathsToMatch("/admin/vessels/**", "/admin/voyages/**",
                        "/admin/shipping-companies/**", "/admin/schedules/**")
                .build();
    }

    @Bean
    public GroupedOpenApi systemGroup() {
        return GroupedOpenApi.builder()
                .group("8. Hệ thống")
                .pathsToMatch("/admin/alerts/**", "/notifications/**", "/admin/system-logs/**",
                        "/admin/dashboard/**", "/dashboard/**", "/admin/reports/**",
                        "/admin/reviews/**", "/reviews/**", "/public/**", "/chat/**")
                .build();
    }

    @Bean
    public GroupedOpenApi allGroup() {
        return GroupedOpenApi.builder()
                .group("Tất cả API")
                .pathsToMatch("/**")
                .build();
    }
}

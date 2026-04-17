package com.anhnht.warehouse.service.modules.wallet.service.impl;

import com.anhnht.warehouse.service.common.config.PayOSConfig;
import com.anhnht.warehouse.service.common.constant.ErrorCode;
import com.anhnht.warehouse.service.common.exception.BusinessException;
import com.anhnht.warehouse.service.modules.user.entity.User;
import com.anhnht.warehouse.service.modules.wallet.dto.request.PayOSWebhookRequest;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PayOSLinkResult;
import com.anhnht.warehouse.service.modules.wallet.dto.response.PayOSPaymentStatus;
import com.anhnht.warehouse.service.modules.wallet.service.PayOSService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayOSServiceImpl implements PayOSService {

    private final PayOSConfig  payOSConfig;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public PayOSLinkResult createPaymentLink(User user, Long orderCode, BigDecimal amount,
                                             String description, String returnUrl, String cancelUrl) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("orderCode", orderCode);
            payload.put("amount", amount.intValue());
            payload.put("description", description);
            payload.put("returnUrl", returnUrl);
            payload.put("cancelUrl", cancelUrl);
            payload.put("buyerName", safe(user.getFullName()));
            payload.put("buyerEmail", safe(user.getEmail()));
            payload.put("buyerPhone", safe(user.getPhone()));

            String signature = generateSignature(amount.intValue(), cancelUrl, description, orderCode, returnUrl);
            payload.put("signature", signature);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-client-id", payOSConfig.getClientId());
            headers.set("x-api-key", payOSConfig.getApiKey());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            String url = payOSConfig.getBaseUrl() + "/v2/payment-requests";

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            JsonNode responseData = objectMapper.readTree(response.getBody());

            String responseCode = responseData.path("code").asText();
            if (!"00".equals(responseCode)) {
                String desc = responseData.path("desc").asText("Unknown error");
                throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR, "PayOS error: " + desc);
            }

            JsonNode data = responseData.path("data");
            PayOSLinkResult result = new PayOSLinkResult();
            result.setPaymentLinkId(data.path("paymentLinkId").asText());
            result.setCheckoutUrl(data.path("checkoutUrl").asText(null));
            result.setQrCode(data.path("qrCode").asText(null));
            result.setRawResponse(response.getBody());

            if (result.getCheckoutUrl() == null) {
                throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR, "Missing checkoutUrl from PayOS");
            }

            return result;

        } catch (HttpClientErrorException e) {
            log.error("PayOS API error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.PAYMENT_LINK_CREATION_FAILED, "Failed to create PayOS link");
        } catch (Exception e) {
            log.error("PayOS create link failed", e);
            throw new BusinessException(ErrorCode.PAYMENT_LINK_CREATION_FAILED, "Failed to create PayOS link");
        }
    }

    @Override
    public PayOSPaymentStatus getPaymentStatus(Long orderCode) {
        try {
            String url = payOSConfig.getBaseUrl() + "/v2/payment-requests/" + orderCode;
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-client-id", payOSConfig.getClientId());
            headers.set("x-api-key", payOSConfig.getApiKey());

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String responseCode = root.path("code").asText();
            if (!"00".equals(responseCode)) {
                String desc = root.path("desc").asText("Unknown error");
                throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR, "PayOS error: " + desc);
            }

            JsonNode data = root.path("data");
            PayOSPaymentStatus status = new PayOSPaymentStatus();
            status.setStatus(data.path("status").asText());
            status.setPaymentLinkId(data.path("id").asText(null));
            status.setCheckoutUrl(data.path("checkoutUrl").asText(null));
            status.setQrCode(data.path("qrCode").asText(null));
            status.setAmount(data.path("amount").isMissingNode() ? null : data.path("amount").asInt());
            status.setRawResponse(response.getBody());
            return status;

        } catch (Exception e) {
            log.error("PayOS status check failed", e);
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR, "Failed to get PayOS status");
        }
    }

    @Override
    public void cancelPaymentLink(Long orderCode) {
        try {
            String url = payOSConfig.getBaseUrl() + "/v2/payment-requests/" + orderCode + "/cancel";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-client-id", payOSConfig.getClientId());
            headers.set("x-api-key", payOSConfig.getApiKey());

            Map<String, String> payload = new HashMap<>();
            payload.put("cancellationReason", "User cancelled");

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(payload, headers);
            restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        } catch (Exception e) {
            log.error("PayOS cancel failed", e);
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR, "Failed to cancel PayOS link");
        }
    }

    @Override
    public boolean verifyWebhookSignature(PayOSWebhookRequest webhook) {
        try {
            if (webhook == null || webhook.getData() == null) return false;

            PayOSWebhookRequest.WebhookData data = webhook.getData();
            String dataStr = "amount=" + data.getAmount()
                    + "&code=" + data.getCode()
                    + "&desc=" + data.getDesc()
                    + "&orderCode=" + data.getOrderCode();

            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    payOSConfig.getChecksumKey().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);

            byte[] hash = hmac.doFinal(dataStr.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            String calculated = hexString.toString();
            return calculated.equals(webhook.getSignature());

        } catch (Exception e) {
            log.error("Webhook signature verify failed", e);
            return false;
        }
    }

    private String generateSignature(int amount, String cancelUrl, String description,
                                     long orderCode, String returnUrl) {
        try {
            String data = "amount=" + amount
                    + "&cancelUrl=" + cancelUrl
                    + "&description=" + description
                    + "&orderCode=" + orderCode
                    + "&returnUrl=" + returnUrl;

            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    payOSConfig.getChecksumKey().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);

            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();

        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR, "Failed to generate signature");
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}

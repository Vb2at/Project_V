package com.V_Beat.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GoogleOAuthService {
    
    @Value("${google.client-id}")
    private String clientId;
    
    @Value("${google.client-secret}")
    private String clientSecret;
    
    @Value("${google.redirect-uri}")
    private String redirectUri;

    // 1. 구글 로그인 URL 생성
    public String getGoogleLoginUrl() {
        return "https://accounts.google.com/o/oauth2/v2/auth"
            + "?client_id=" + clientId
            + "&redirect_uri=" + redirectUri
            + "&response_type=code"
            + "&scope=openid profile email";
    }

    // 2. 액세스 토큰 받기
    public String getAccessToken(String code) {
        RestTemplate restTemplate = new RestTemplate();

        // 요청 파라미터
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("code", code);

        // 요청 헤더
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Type", "application/x-www-form-urlencoded");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        // POST 요청
        ResponseEntity<String> response = restTemplate.postForEntity(
            "https://oauth2.googleapis.com/token",
            request,
            String.class
        );

        // 응답에서 access_token 추출
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonNode = mapper.readTree(response.getBody());
            return jsonNode.get("access_token").asText();
        } catch (Exception e) {
            throw new RuntimeException("액세스 토큰 파싱 실패", e);
        }
    }

    // 3. 사용자 정보 조회
    public Map<String, Object> getUserInfo(String accessToken) {
        RestTemplate restTemplate = new RestTemplate();

        // 요청 헤더
        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + accessToken);

        HttpEntity<String> request = new HttpEntity<>(headers);

        // GET 요청
        ResponseEntity<String> response = restTemplate.exchange(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            HttpMethod.GET,
            request,
            String.class
        );

        // 응답 파싱
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonNode = mapper.readTree(response.getBody());

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", jsonNode.get("id").asText());
            userInfo.put("nickname", jsonNode.get("name").asText());
            userInfo.put("email", jsonNode.get("email").asText());

            // 프로필 이미지 (있으면)
            if (jsonNode.has("picture")) {
                userInfo.put("profileImg", jsonNode.get("picture").asText());
            }

            return userInfo;

        } catch (Exception e) {
            throw new RuntimeException("사용자 정보 파싱 실패", e);
        }
    }
}
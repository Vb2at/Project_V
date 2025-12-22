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
public class KakaoOAuthService {

    @Value("${kakao.client-id}")
    private String clientId;
    
    @Value("${kakao.client-secret}")
    private String clientSecret;

    @Value("${kakao.redirect-uri}")
    private String redirectUri;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 1. 카카오 로그인 URL 생성
    public String getKakaoLoginUrl() {
        return "https://kauth.kakao.com/oauth/authorize"
                + "?client_id=" + clientId
                + "&redirect_uri=" + redirectUri
                + "&response_type=code";
    }

    // 2. 인가 코드로 액세스 토큰 요청
    public String getAccessToken(String code) throws Exception {
        String url = "https://kauth.kakao.com/oauth/token";

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-type", "application/x-www-form-urlencoded;charset=utf-8");

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("code", code);
        
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
        JsonNode jsonNode = objectMapper.readTree(response.getBody());

        return jsonNode.get("access_token").asText();
    }

    // 3. 액세스 토큰으로 사용자 정보 조회
    public Map<String, Object> getUserInfo(String accessToken) throws Exception {
        String url = "https://kapi.kakao.com/v2/user/me";

        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + accessToken);
        headers.add("Content-type", "application/x-www-form-urlencoded;charset=utf-8");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);
        JsonNode jsonNode = objectMapper.readTree(response.getBody());

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", jsonNode.get("id").asText());
        userInfo.put("nickname", jsonNode.path("properties").path("nickname").asText());
        
        if (jsonNode.path("properties").has("profile_image")) {
            userInfo.put("profileImg", jsonNode.path("properties").path("profile_image").asText());
        }
        
        
        // 이메일은 선택 동의이므로 없을 수 있음
        if (jsonNode.path("kakao_account").has("email")) {
            userInfo.put("email", jsonNode.path("kakao_account").path("email").asText());
        } else {
            // 이메일 없으면 임시 이메일 생성
            userInfo.put("email", "kakao_" + jsonNode.get("id").asText() + "@kakao.local");
        }

        return userInfo;
    }
}
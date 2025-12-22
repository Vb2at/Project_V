package com.V_Beat.service;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GitHubOAuthService {

    @Value("${github.client-id}")
    private String clientId;
    
    @Value("${github.client-secret}")
    private String clientSecret;
    
    @Value("${github.redirect-uri}")
    private String redirectUri;

    /** 1. GitHub 로그인 URL 생성 */
    public String getGitHubLoginUrl() {
        return "https://github.com/login/oauth/authorize"
            + "?client_id=" + clientId
            + "&redirect_uri=" + redirectUri
            + "&scope=user:email";
    }

    /** 2. GitHub Access Token 요청 */
    public String getAccessToken(String code) {
        
        RestTemplate restTemplate = new RestTemplate();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("code", code);
        body.add("redirect_uri", redirectUri);
        
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://github.com/login/oauth/access_token",
                request,
                Map.class
            );
            
            return (String) response.getBody().get("access_token");
            
        } catch (Exception e) {
            throw new RuntimeException("깃헙 토큰 요청 실패: " + e.getMessage());
        }
    }

    /** 3. 사용자 정보 조회 */
    public Map<String, Object> getUserInfo(String accessToken) {
        
        RestTemplate restTemplate = new RestTemplate();
        ObjectMapper mapper = new ObjectMapper();
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        try {
            // --- 3-1: 기본 정보 조회 ---
            ResponseEntity<String> userResponse = restTemplate.exchange(
                "https://api.github.com/user",
                HttpMethod.GET,
                request,
                String.class
            );
            
            JsonNode userJson = mapper.readTree(userResponse.getBody());
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", userJson.get("id").asText());
            userInfo.put("nickname", userJson.get("login").asText());
            userInfo.put("profileImg", userJson.get("avatar_url").asText());
            
            // --- 3-2: 이메일 조회 ---
            ResponseEntity<String> emailResponse = restTemplate.exchange(
                "https://api.github.com/user/emails",
                HttpMethod.GET,
                request,
                String.class
            );
            
            JsonNode emails = mapper.readTree(emailResponse.getBody());
            
            String email = null;
            if (emails.isArray()) {
                for (JsonNode emailNode : emails) {
                    if (emailNode.get("primary").asBoolean()) {
                        email = emailNode.get("email").asText();
                        break;
                    }
                }
            }
            
            if (email == null) {
                email = "github_" + userJson.get("id").asText() + "@github.local";
            }
            
            userInfo.put("email", email);
            
            return userInfo;
            
        } catch (Exception e) {
            throw new RuntimeException("깃헙 사용자 정보 조회 실패: " + e.getMessage());
        }
    }
}
package com.V_Beat.ai.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.ai.service.AiAnalyzeService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/ai")
public class AiAnalyzeController {

    private AiAnalyzeService aiAnalyzeService;

    public AiAnalyzeController(AiAnalyzeService aiAnalyzeService) {
        this.aiAnalyzeService = aiAnalyzeService;
    }

    @PostMapping("/analyze/{diff}")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestParam("file") MultipartFile file,
            @RequestParam("visibility") String visibility,
            @PathVariable String diff,
            HttpSession session
    ) throws Exception {

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            return ResponseEntity.status(401).build();
        }

        Long songId = this.aiAnalyzeService.analyzeSave(file, diff, visibility, loginUserId);
        
        //기본 응답
        if (!"UNLISTED".equalsIgnoreCase(visibility)) {
        	return ResponseEntity.ok(Map.of("songId", songId));
        }
        
        //unlisted -> 토큰 조회
        String shareToken = this.aiAnalyzeService.getShareToken(songId);
        
        return ResponseEntity.ok(
        	Map.of(
        		"songId", songId,
        		"shareToken", shareToken
        			)
        );
    }
}

package com.V_Beat.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.dto.Score;
import com.V_Beat.service.ScoreService;

import jakarta.servlet.http.HttpSession;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/api/scores")
public class ScoreController {

	private ScoreService scoreService;
	
	public ScoreController(ScoreService scoreService) {
		this.scoreService = scoreService;
	}

    @PostMapping
    public ResponseEntity<?> save(@RequestBody Score req, HttpSession session) {
        //세션 userId 안전 추출 (Long / Integer 모두 대응)
        Object v = session.getAttribute("loginUserId");
        System.out.println("loginUserId in session = " + v);
        Long loginUserId = null;

        if (v instanceof Long) {
            loginUserId = (Long) v;
        } else if (v instanceof Integer) {
            loginUserId = ((Integer) v).longValue();
        }

         if (loginUserId == null) {
             return ResponseEntity.status(401).build();
         }

        this.scoreService.save(req, loginUserId);
        return ResponseEntity.ok().build();
    }
    
    //내 기록 조회
    @GetMapping("/record")
    public List<Score> record(HttpSession session) {
    	Integer userId = (Integer) session.getAttribute("loginUserId");
    	if(userId == null) {
    		return List.of();
    	}
    	
    	return this.scoreService.findByUserId(userId);
    }
}

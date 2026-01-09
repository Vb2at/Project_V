package com.V_Beat.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.dto.Score;
import com.V_Beat.service.ScoreService;

import org.springframework.http.ResponseEntity;
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
	public ResponseEntity<Void> save(@RequestBody Score req) {
		this.scoreService.save(req);
		return ResponseEntity.ok().build();
	}
}
package com.V_Beat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.dto.Ranking;
import com.V_Beat.service.RankingService;

@RestController
@RequestMapping("/api/ranking")
public class RankingController {
	
	private RankingService rankingService;
	
	public RankingController(RankingService rankingService) {
		this.rankingService = rankingService;
	}
	
	@GetMapping("/{songId}/{diff}")
	public Map<String, Object> getRanking(@PathVariable long songId, @PathVariable String diff) {
		Map<String, Object> res = new HashMap<>();
		
		List<Ranking> ranking = this.rankingService.getRanking(songId, diff);
		
		res.put("ok", true);
		res.put("ranking", ranking);
		return res;
	}
}

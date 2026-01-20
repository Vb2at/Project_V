package com.V_Beat.review.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.review.service.ReviewService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/admin")
public class ReviewController {

	private ReviewService reviewService;

	public ReviewController(ReviewService reviewService) {
		this.reviewService = reviewService;
	}

	// 심사 대기 목록 조회 API
	@GetMapping("/songs")
	public Map<String, Object> pendingList(@RequestParam(defaultValue = "PENDING") String visibility,
			@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size,
			HttpSession session) {
		return this.reviewService.getPendingList(session, visibility, page, size);
	}

	// 곡 상세 조회 API
//	@GetMapping("/song/{songId}")

	// 심사 처리 API
//	@PostMapping("/song/{songId}/review")

}

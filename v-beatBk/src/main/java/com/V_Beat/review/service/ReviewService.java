package com.V_Beat.review.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.V_Beat.review.dao.ReviewDao;

import jakarta.servlet.http.HttpSession;

@Service
public class ReviewService {
	
	private ReviewDao reviewDao;
	
	public ReviewService(ReviewDao reviewDao) {
		this.reviewDao = reviewDao;
	}
	
	private static Set<String> ALLOWED = Set.of("PENDING", "PUBLIC", "PRIVATE", "BLOCKED", "UNLISTED");
	
	private void requireAdmin(HttpSession session) {
		String role = (String) session.getAttribute("loginUserRole");
	}
	
	//심사 대기 목록 조회
	public Map<String, Object> getPendingList(HttpSession session, String visibility, int page, int size) {
		//관리자 검증
		requireAdmin(session);
		
		//visibility 정규화 + 검증
		String v = (visibility == null || visibility.isBlank()) 
				? "PENDING" : visibility.trim().toUpperCase();
		
		if(!ALLOWED.contains(v)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 visibility 값입니다.");
		}
		
		//페이징
		int p = Math.max(page, 1);
		int s = Math.min(Math.max(size, 1), 100);
		int offset = (p - 1) * s;
		
		//Dao 조회
		List<Map<String, Object>> list = this.reviewDao.findSongByVisibility(v, s, offset);
		int total = this.reviewDao.countSongByVisibility(v);
		
		//응답
		Map<String, Object> res = new HashMap<>();
		res.put("ok", true);
		res.put("visibility", v);
		res.put("page", p);
		res.put("size", s);
		res.put("total", total);
		res.put("list", list);
		return res;
	}
}

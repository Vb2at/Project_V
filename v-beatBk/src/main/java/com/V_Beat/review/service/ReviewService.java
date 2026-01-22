package com.V_Beat.review.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.V_Beat.review.dao.ReviewDao;
import com.V_Beat.review.dto.AdminSongDetail;
import com.V_Beat.review.dto.ReviewActionReq;

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
		if (role == null || !"ADMIN".equals(role)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 권한이 필요합니다.");
		}
	}

	//심사 대기 목록 조회
	public Map<String, Object> getPendingList(HttpSession session, String visibility, int page, int size) {
		// 관리자 검증
		requireAdmin(session);
		
		//로그인 검증
		Integer adminId = (Integer) session.getAttribute("loginUserId");
		if (adminId == null) {
		    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요한 기능입니다.");
		}

		//visibility 정규화 + 검증
		String v = (visibility == null || visibility.isBlank()) ? "PENDING" : visibility.trim().toUpperCase();

		if (!ALLOWED.contains(v)) {
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

	//곡 상세 조회
	public Map<String, Object> getSongDetail(long songId, HttpSession session) {
		Map<String, Object> res = new HashMap<>();
		//관리자 검증
		requireAdmin(session);
		
		//로그인 검증
		Integer adminId = (Integer) session.getAttribute("loginUserId");
		if (adminId == null) {
		    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요한 기능입니다.");
		}
		
		//곡 존재 검증
		AdminSongDetail song = this.reviewDao.getSongDetail(songId);
		if (song == null) {
			res.put("ok", false);
			res.put("message", "존재하지 않는 곡입니다.");
			return res;
		}

		res.put("ok", true);
		res.put("song", song);
		return res;
	}
	
	//곡 심사 처리
	public Map<String, Object> reviewSong(long songId, ReviewActionReq req, HttpSession session) {
		Map<String, Object> res = new HashMap<>();
		//관리자 검증
		requireAdmin(session);
		
		//로그인 검증
		Integer adminId = (Integer) session.getAttribute("loginUserId");
		if (adminId == null) {
		    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요한 기능입니다.");
		}
		int admin = adminId;
		
		//곡 존재 검증
		AdminSongDetail song = this.reviewDao.getSongDetail(songId);
		if (song == null) {
			res.put("ok", false);
			res.put("message", "존재하지 않는 곡입니다.");
			return res;
		}
		
		//상태 검증 (PENDING만 심사 가능)
		if(!"PENDING".equals(song.getVisibility())) {
			res.put("ok", false);
			res.put("message", "심사 대기 상태의 곡만 처리 가능합니다.");
			return res;
		}
		
		//actino 검증 + 처리 후 visibility 결정
		String action = (req.getAction() == null) ? "" : req.getAction().trim().toUpperCase();
		String newVisibility;
		
		if("APPROVE".equals(action)) {
			newVisibility = "PUBLIC";
		} else if("REJECT".equals(action)) {
			newVisibility = "PRIVATE";
		} else if("BLOCK".equals(action)) {
			newVisibility = "BLOCKED";
		} else {
			res.put("ok", false);
			res.put("message", "유효하지 않은 처리입니다.");
			return res;
		}
		
		//처리 정보
		String reason = (req.getReason() == null) ? "" : req.getReason().trim();
		
		//DB에 상태 업데이트
		this.reviewDao.updateSongReview(songId, newVisibility, reason, admin);
		
		res.put("ok", true);
		res.put("songId", songId);
		res.put("visibility", newVisibility);
		return res;
	}
}
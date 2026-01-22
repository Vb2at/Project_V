package com.V_Beat.adminUser.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.V_Beat.adminUser.dao.AdminUserDao;
import com.V_Beat.adminUser.dto.AdminUserList;
import com.V_Beat.dto.User;

import jakarta.servlet.http.HttpSession;

@Service
public class AdminUserService {
	
	private final AdminUserDao adminUserDao;
	
	public AdminUserService(AdminUserDao adminUserDao) {
		this.adminUserDao = adminUserDao;
	}
	
	//관리자 검증 메서드
	private void requireAdmin(HttpSession session) {
		String role = (String) session.getAttribute("loginUserRole");
		if (role == null || !"ADMIN".equals(role)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 권한이 필요합니다.");
		}
	}
	
	//유저 목록 조회
	public Map<String, Object> getUsers(String keyword, String role, Integer page, Integer size, HttpSession session) {
		//관리자 검증
		requireAdmin(session);
		
		//페이징 처리
		int p = (page == null || page < 1) ? 1 : page;
		int s = (size == null || size < 1) ? 10 : Math.min(size, 20);
		
		int offset = (p - 1) * s;
		
		//role 검증
		if(role != null && !role.isBlank()) {
			String r = role.trim().toUpperCase();
			if(!("USER".equals(r) || "ADMIN".equals(r) || "BLOCK".equals(r))) {
				throw new IllegalArgumentException("role 값이 올바르지 않습니다.");
			}
			role = r;
		} else {
			role = null;
		}
		
		//조회
		List<AdminUserList> list = this.adminUserDao.getUsers(keyword, role, s, offset);
		int total = this.adminUserDao.countUsers(keyword, role);
		
		Map<String, Object> res = new HashMap<>();
		res.put("list", list);
		res.put("page", p);
		res.put("size", s);
		res.put("total", total);
		return res;
	}

	//관리자 수동 차단
	@Transactional
	public Map<String, Object> blockUser(int userId, HttpSession session) {
		Map<String, Object> res = new HashMap<>();
		
		//관리자 검증
		requireAdmin(session);
		
		//사용자 조회
		User user = this.adminUserDao.findById(userId);
		if(user == null) {
			res.put("message", "존재하지 않는 사용자입니다.");
			return res;
		}
		
		//관리자 차단 방지
		if("ADMIN".equals(user.getRole())) {
			res.put("message", "관리자는 차단할 수 없습니다.");
			return res;
		}
		
		//중복 차단 방지
		if("BLOCK".equals(user.getRole())) {
			res.put("message", "이미 차단된 사용자입니다.");
			return res;
		}
		
		//차단한 관리자 아이디 받아오기
		int adminId = (Integer) session.getAttribute("loginUserId");
		
		this.adminUserDao.updateUserRole(userId, "BLOCK");
		this.adminUserDao.insertAdminBlock(adminId, userId);
		
		res.put("message", "사용자가 차단되었습니다.");
		return res;
	}

	//관리자 차단 해제
	@Transactional
	public Map<String, Object> unblockUser(int userId, HttpSession session) {
		Map<String, Object> res = new HashMap<>();
		
		//관리자 검증
		requireAdmin(session);
		
		//사용자 조회
		User user = this.adminUserDao.findById(userId);
		if(user == null) {
			res.put("message", "존재하지 않는 사용자입니다.");
			return res;
		}
		
		this.adminUserDao.updateUserRole(userId, "USER");
		
		res.put("message", "사용자 차단이 해제되었습니다.");
		return res;
	}
}
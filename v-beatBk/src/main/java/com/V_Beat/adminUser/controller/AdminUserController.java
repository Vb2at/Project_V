package com.V_Beat.adminUser.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.adminUser.service.AdminUserService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

	private final AdminUserService adminUserSevice;

	public AdminUserController(AdminUserService adminUserSevice) {
		this.adminUserSevice = adminUserSevice;
	}

	//유저 목록 조회
	@GetMapping
	public Map<String, Object> getUsers(@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String role, @RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer size, HttpSession session) {
		return this.adminUserSevice.getUsers(keyword, role, page, size, session);
	}
	
	//관리자 수동 차단
	@PostMapping("{userId}/block")
	public Map<String, Object> blockUser(@PathVariable int userId, HttpSession session) {
		return this.adminUserSevice.blockUser(userId, session);
	}
	
	//관리자 차단 해제
	@PostMapping("/{userId}/unblock")
	public Map<String, Object> unblockUser(@PathVariable int userId, HttpSession session) {
		return this.adminUserSevice.unblockUser(userId, session);
	}
}
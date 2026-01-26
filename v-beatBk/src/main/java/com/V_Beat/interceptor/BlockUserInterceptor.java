package com.V_Beat.interceptor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.V_Beat.dto.User;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class BlockUserInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(HttpServletRequest request, 
			HttpServletResponse response, Object handler) throws Exception {
		HttpSession session = request.getSession(false);
		if(session == null) {
			return true;
		}
		
		User loginUser = (User) session.getAttribute("loginUser");
		if(loginUser == null) {
			return true;
		}
		
		//관리자 통과
		if("ADMIN".equals(loginUser.getRole())) {
			return true;
		}
		
		//차단 유저 차단
		if("BLOCK".equals(loginUser.getRole())) {
			response.setStatus(HttpStatus.FORBIDDEN.value());
			response.setContentType("application/json;charset=UTF-8");
			response.getWriter().write("""
					{"message": "차단된 사용자는 이용 불가합니다."}
					""");
			return false;
		}
		return true;
	}
}
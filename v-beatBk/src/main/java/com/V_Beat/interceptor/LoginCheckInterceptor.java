package com.V_Beat.interceptor;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class LoginCheckInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

    	// CORS preflight 방어 (현재는 WebConfig에서 처리됨)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return true;
        }
        
        String uri = request.getRequestURI();

        HttpSession session = request.getSession(false);
        Integer loginUserId = (session == null) ? null : (Integer) session.getAttribute("loginUserId");

        // 로그인 필요한 API만 체크
        if (isLoginRequired(uri) && loginUserId == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
            return false;
        }

        return true;
    }
    
    private boolean isLoginRequired(String uri) {
        // 로그인 필요한 API prefix 목록
        return uri.startsWith("/api/user/")
        || uri.startsWith("/api/friend/")
            || uri.startsWith("/api/duel/")
        || uri.startsWith("/api/multi/");
        // 로그인 기능 만들어지면 주석 해제
//            || uri.equals("/api/scores")        // POST /api/scores
//            || uri.startsWith("/api/scores/");  // 혹시 나중에 /api/scores/{id} 생기면 대비
    }
}
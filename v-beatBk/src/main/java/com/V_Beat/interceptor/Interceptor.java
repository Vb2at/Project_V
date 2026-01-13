package com.V_Beat.interceptor;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class Interceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

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
            || uri.equals("/api/scores")        // POST /api/scores
            || uri.startsWith("/api/scores/");  // 혹시 나중에 /api/scores/{id} 생기면 대비
    }
}
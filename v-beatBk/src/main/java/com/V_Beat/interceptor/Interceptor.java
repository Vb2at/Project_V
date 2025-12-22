package com.V_Beat.interceptor;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.V_Beat.dto.Req;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 모든 HTTP 요청 전처리 인터셉터
 * 세션에서 로그인 정보를 Req 객체로 로드 + URL 접근 제어
 */
@Component
public class Interceptor implements HandlerInterceptor {

    private final Req req;

    public Interceptor(Req req) {
        this.req = req;
    }

    /**
     * 컨트롤러 실행 전 호출
     * @return true: 요청 계속 진행, false: 요청 중단
     */
    @Override
    public boolean preHandle(HttpServletRequest request,
                              HttpServletResponse response,
                              Object handler) throws Exception {
        
        // 세션에서 로그인 멤버 정보를 Req 객체로 로드
        int loginMemberId = req.getLoginMemberId();
        
        String requestURI = request.getRequestURI();
        
        // 1. 로그인 필수 URL 체크
        if (isLoginRequired(requestURI)) {
            if (loginMemberId == 0) {
                // 로그인 안 했으면 로그인 페이지로
                response.sendRedirect("/user/member/login");
                return false;
            }
        }
        
        // 2. 로그인한 사용자는 로그인/회원가입 페이지 접근 차단
        if (isAuthPage(requestURI)) {
            if (loginMemberId != 0) {
                // 이미 로그인했으면 메인으로
                response.sendRedirect("/");
                return false;
            }
        }
        
        return true;
    }
    
    //로그인 필수 URL인지 확인
    private boolean isLoginRequired(String uri) {
        // 정적 리소스 제외
        if (uri.startsWith("/resource/") || 
            uri.startsWith("/css/") || 
            uri.startsWith("/js/") || 
            uri.startsWith("/images/")) {
            return false;
        }
        
        // OAuth 콜백은 제외 (로그인 과정이므로)
        if (uri.startsWith("/oauth/")) {
            return false;
        }
        
        // 로그인 필수 URL 패턴
        return uri.startsWith("/user/member/myPage") ||   // 마이페이지
               uri.startsWith("/user/member/deleteAccount") ||  // 회원탈퇴
               uri.startsWith("/user/member/doUpdateNickName") ||  // 닉네임 변경
               uri.startsWith("/user/member/doUpdatePw") ||  // 비밀번호 변경
               uri.startsWith("/team/") ||                 // 팀 관련
               uri.startsWith("/channel/") ||              // 채널 관련
               uri.startsWith("/message/") ||              // 메시지 관련
               uri.startsWith("/online/");                 // 접속자 관련
    }
    
    // 로그인/회원가입 페이지인지 확인
    private boolean isAuthPage(String uri) {
        return uri.equals("/user/member/login") ||
               uri.equals("/user/member/join") ||
               uri.equals("/user/member/doLogin") ||
               uri.equals("/user/member/doJoin");
    }
}
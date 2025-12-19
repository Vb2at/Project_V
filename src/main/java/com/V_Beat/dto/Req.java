package com.V_Beat.dto;

import java.io.IOException;

import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;

import com.V_Beat.util.Util;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.Getter;

@Component
@Scope(value = "request", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class Req {
    
    @Getter
    private Member loginMember;
    private HttpServletResponse resp;
    private HttpSession session;
    
    public Req(HttpServletRequest request, HttpServletResponse response) {
        this.resp = response;
        this.session = request.getSession();
        this.loginMember = (Member) this.session.getAttribute("loginMember");
        
        if(this.loginMember == null) {
            this.loginMember = new Member();
        }
        
        request.setAttribute("req", this);
    }
    
    public void jsPrintReqplace(String msg, String uri) {
        this.resp.setContentType("text/html; charset=UTF-8;");
        
        try {
            this.resp.getWriter().append(Util.jsReplace(msg, uri));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void login(Member member) {
        this.session.setAttribute("loginMember", member);
        this.loginMember = member;
    }
    
    public int getLoginMemberId() {
        if (this.loginMember != null && this.loginMember.getId() > 0) {
            return this.loginMember.getId();
        }
        return 0;
    }
    
    public void logout() {
        if (this.session != null) {
            this.session.invalidate();
        }
        this.loginMember = new Member();
    }
    
    public void init() {
        
    }
}
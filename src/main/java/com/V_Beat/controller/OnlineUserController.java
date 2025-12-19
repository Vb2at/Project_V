package com.V_Beat.controller;

import java.util.Set;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.V_Beat.service.OnlineUserService;


@Controller
public class OnlineUserController {
    
    private final OnlineUserService onlineUserService;
    
    public OnlineUserController(OnlineUserService onlineUserService) {
        this.onlineUserService = onlineUserService;
    }
    
    // 현재 접속 중인 사용자 ID 목록 조회 (AJAX)
    // chatArea.jsp에서 WebSocket 연결 직후 초기 접속자 목록을 가져올 때 사용
    // Race Condition 해결: CONNECT 시 브로드캐스트를 놓치는 경우 대비
    @GetMapping("/online/getUsers")
    @ResponseBody
    public Set<Integer> getOnlineUsers() {
        // Set<Integer>: 접속 중인 사용자 ID 집합 (중복 없음)
        return onlineUserService.getOnlineUsers();
    }
}
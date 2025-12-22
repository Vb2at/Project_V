package com.V_Beat.listener;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.V_Beat.event.OnlineUsersEvent;


/**
 * 접속자 변경 이벤트 리스너
 * 순환 참조 오류가 발견되어 생성 OnlineUserService와 WebSocket 설정 분리
 */
@Component
public class OnlineUsersEventListener {
    
    private final SimpMessagingTemplate simpMessagingTemplate;
    
    // 생성자 주입
    public OnlineUsersEventListener(SimpMessagingTemplate simpMessagingTemplate) {
        this.simpMessagingTemplate = simpMessagingTemplate;
    }
    
    /**
     * 접속자 변경 이벤트 처리
     * OnlineUserService에서 이벤트 발행 시 자동 호출
     */
    @EventListener
    public void handleOnlineUsersEvent(OnlineUsersEvent event) {
        // 모든 /topic/online-users 구독자에게 접속자 목록 브로드캐스트
        simpMessagingTemplate.convertAndSend("/topic/online-users", event.getOnlineUsers());
    }
}
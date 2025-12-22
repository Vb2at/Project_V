package com.V_Beat.service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.V_Beat.event.OnlineUsersEvent;

/**
 * 접속자 관리 서비스
 * 순환 참조 해결오류가 발견되어 생성, 설정과 분리하여 이벤트 기반으로 처리
 */
@Service
public class OnlineUserService {
    
    private final ApplicationEventPublisher eventPublisher;  // Spring 이벤트 발행
    private final Set<Integer> onlineUsers = ConcurrentHashMap.newKeySet();  // 동시성 안전한 Set
    
    // 생성자 주입
    public OnlineUserService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }
    
    // ===== 사용자 접속 처리 (WebSocket CONNECT) =====
    public void addUser(Integer userId) {
        onlineUsers.add(userId);  // Set에 추가 (중복 자동 제거)
        broadcastOnlineUsers();   // 변경사항 브로드캐스트
    }
    
    // ===== 사용자 종료 처리 (WebSocket DISCONNECT) =====
    public void removeUser(Integer userId) {
        onlineUsers.remove(userId);  // Set에서 제거
        broadcastOnlineUsers();      // 변경사항 브로드캐스트
    }
    
    // ===== 이벤트 발행 (private) =====
    // OnlineUsersEventListener가 수신하여 WebSocket으로 브로드캐스트
    private void broadcastOnlineUsers() {
        eventPublisher.publishEvent(new OnlineUsersEvent(Set.copyOf(onlineUsers)));
    }
    
    // ===== 현재 접속자 목록 조회 =====
    // HTTP 엔드포인트(/online/getUsers)에서 사용
    // 불변 Set 반환으로 외부 수정 방지
    public Set<Integer> getOnlineUsers() {
        return Set.copyOf(onlineUsers);
    }
}
package com.V_Beat.service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.V_Beat.event.OnlineUsersEvent;

/**
 * 접속자 관리 서비스
 * - WebSocket CONNECT/DISCONNECT에서 add/remove 호출
 * - 온라인 유저 변경 시 이벤트 발행 -> WS 브로드캐스트
 */
@Service
public class OnlineUserService {

    private final ApplicationEventPublisher eventPublisher;

    // ✅ 동시성 안전한 Set
    private final Set<Integer> onlineUsers = ConcurrentHashMap.newKeySet();

    public OnlineUserService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    // ===== 사용자 접속 처리 (WebSocket CONNECT) =====
    public void addUser(Integer userId) {
        if (userId == null) return;

        boolean changed = onlineUsers.add(userId); // Set이라 이미 있으면 false
        if (changed) {
            broadcastOnlineUsers();
        }
    }

    // ===== 사용자 종료 처리 (WebSocket DISCONNECT) =====
    public void removeUser(Integer userId) {
        if (userId == null) return;

        boolean changed = onlineUsers.remove(userId);
        if (changed) {
            broadcastOnlineUsers();
        }
    }

    // ===== 현재 온라인 목록 제공(친구목록 online 주입용) =====
    public Set<Integer> getOnlineUsers() {
        return onlineUsers;
    }

    // ===== 변경사항 브로드캐스트 =====
    private void broadcastOnlineUsers() {
        // ✅ 스냅샷으로 발행 (외부에서 set 수정 못하게)
        eventPublisher.publishEvent(new OnlineUsersEvent(Set.copyOf(onlineUsers)));
    }
}

package com.V_Beat.event;

import java.util.Set;

/**
 * 접속자 상태 변경 이벤트
 * 순환 참조 오류가 발견되어 생성 OnlineUserService → 이벤트 발행 → Listener → WebSocket 전송
 */
public class OnlineUsersEvent {

    private final Set<Integer> onlineUsers;  // 현재 접속 중인 사용자 ID 집합

    // 생성자
    public OnlineUsersEvent(Set<Integer> onlineUsers) {
        this.onlineUsers = onlineUsers;
    }

    // Getter
    public Set<Integer> getOnlineUsers() {
        return onlineUsers;
    }
}
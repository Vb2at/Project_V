package com.V_Beat.event;

import java.util.Set;

/**
 * 현재 온라인 유저 목록 스냅샷 이벤트
 *
 * 용도:
 * - OnlineUserService에서 "온라인 유저 상태가 변경되었을 때" 발행
 * - Listener가 이를 수신하여 WebSocket으로 브로드캐스트
 *
 * 주의:
 * - 이 이벤트는 "전체 스냅샷" 용도입니다.
 * - 향후 online.join / online.leave 이벤트로 분리 가능
 */
public class OnlineUsersEvent {

    /**
     * 현재 접속 중인 사용자 ID 집합
     * - 불변 Set으로 보관하여 외부 수정 방지
     */
    private final Set<Integer> onlineUsers;

    /**
     * @param onlineUsers 현재 온라인 상태의 사용자 ID 목록
     */
    public OnlineUsersEvent(Set<Integer> onlineUsers) {
        // 방어적 복사로 불변성 보장
        this.onlineUsers = Set.copyOf(onlineUsers);
    }

    /**
     * 현재 접속 중인 사용자 ID 집합 반환
     * - 불변 Set
     */
    public Set<Integer> getOnlineUsers() {
        return onlineUsers;
    }
}

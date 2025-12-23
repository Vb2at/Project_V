package com.V_Beat.service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.V_Beat.event.OnlineUsersEvent;

/**
 * 접속자 관리 서비스
 * - WebSocket 세션 단위로 온라인 상태를 관리 (멀티탭/멀티디바이스 대응)
 * - 상태 변경 시 OnlineUsersEvent를 발행하여 Listener가 브로드캐스트 처리
 */
@Service
public class OnlineUserService {

    private final ApplicationEventPublisher eventPublisher;

    /**
     * userId -> sessionId Set
     * 같은 유저가 여러 탭/디바이스로 접속할 수 있으므로 세션을 Set으로 관리합니다.
     */
    private final Map<Integer, Set<String>> userSessions = new ConcurrentHashMap<>();

    public OnlineUserService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    /**
     * ===== (호환용) 사용자 접속 처리 =====
     * 기존 코드가 addUser/removeUser를 호출하는 경우를 대비해 유지합니다.
     * 단, 멀티탭 정확도를 위해서는 addSession/removeSession 사용을 권장드립니다.
     */
    public void addUser(Integer userId) {
        // 세션 정보를 모르는 호출이므로 "가상 세션"을 하나 부여하는 대신
        // 단순 온라인 처리만 합니다(기존 동작 유지).
        // 멀티탭 정합성은 addSession/removeSession에서 보장됩니다.
        userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add("LEGACY");
        broadcastOnlineUsers();
    }

    public void removeUser(Integer userId) {
        userSessions.remove(userId);
        broadcastOnlineUsers();
    }

    /**
     * ===== WebSocket CONNECT 처리 (권장) =====
     * 동일 userId의 여러 접속(탭/디바이스)을 sessionId로 구분해 관리합니다.
     */
    public void addSession(Integer userId, String sessionId) {
        if (userId == null || sessionId == null) {
            return;
        }

        // 해당 유저의 세션 Set을 가져오거나 생성
        Set<String> sessions = userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet());

        // "이 유저가 처음 온라인이 되는 순간"만 브로드캐스트하고 싶으므로,
        // add 전에 비어있었는지(첫 세션인지) 확인합니다.
        boolean wasOffline = sessions.isEmpty();

        sessions.add(sessionId);

        // 첫 세션이 들어온 경우에만 전체 목록 브로드캐스트
        if (wasOffline) {
            broadcastOnlineUsers();
        }
    }

    /**
     * ===== WebSocket DISCONNECT 처리 (권장) =====
     * 해당 세션을 제거하고, 마지막 세션이 끊긴 경우에만 오프라인 처리합니다.
     */
    public void removeSession(Integer userId, String sessionId) {
        if (userId == null || sessionId == null) {
            return;
        }

        Set<String> sessions = userSessions.get(userId);
        if (sessions == null) {
            return;
        }

        sessions.remove(sessionId);

        // 마지막 세션이 끊긴 경우에만 맵에서 제거 + 브로드캐스트
        if (sessions.isEmpty()) {
            userSessions.remove(userId);
            broadcastOnlineUsers();
        }
    }

    /**
     * ===== 현재 접속자 목록 조회 =====
     * /online/getUsers 용도 (불변 Set 반환)
     */
    public Set<Integer> getOnlineUsers() {
        return Set.copyOf(userSessions.keySet());
    }

    /**
     * ===== 이벤트 발행 =====
     * OnlineUsersEventListener가 수신하여 WebSocket으로 브로드캐스트합니다.
     */
    private void broadcastOnlineUsers() {
        eventPublisher.publishEvent(new OnlineUsersEvent(getOnlineUsers()));
    }
}

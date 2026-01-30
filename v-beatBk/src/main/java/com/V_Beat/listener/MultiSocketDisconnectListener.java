package com.V_Beat.listener;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.V_Beat.multi.MultiRoomManager;

@Component
public class MultiSocketDisconnectListener {

    private final MultiRoomManager roomManager;

    public MultiSocketDisconnectListener(MultiRoomManager roomManager) {
        this.roomManager = roomManager;
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {

        StompHeaderAccessor acc = StompHeaderAccessor.wrap(event.getMessage());
        if (acc.getUser() == null) return;

        Integer userId;
        try {
            userId = Integer.parseInt(acc.getUser().getName());
        } catch (Exception e) {
            return;
        }

        String roomId = (String) acc.getSessionAttributes().get("roomId");
        if (roomId == null) return;

        // ❗ 여기서 leaveRoom만 호출
        // - 방 폭파 여부 판단
        // - ROOM_CLOSED / ROOM_STATE 브로드캐스트
        // - 방 리스트 갱신
        // 전부 MultiRoomManager가 책임짐
        roomManager.leaveRoom(roomId, userId);
    }
}

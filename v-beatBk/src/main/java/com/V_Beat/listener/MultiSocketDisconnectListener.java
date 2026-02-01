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
        if (acc.getSessionAttributes() == null) return;

        Integer userId;
        try {
            userId = Integer.parseInt(acc.getUser().getName());
        } catch (Exception e) {
            return;
        }

        String roomId = (String) acc.getSessionAttributes().get("roomId");
        if (roomId == null) return;

        roomManager.leaveRoom(roomId, userId);
    }
}

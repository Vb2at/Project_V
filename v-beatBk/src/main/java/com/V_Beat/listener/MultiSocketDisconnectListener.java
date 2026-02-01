package com.V_Beat.listener;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.V_Beat.multi.MultiRoomManager;

import lombok.extern.slf4j.Slf4j;
@Slf4j
@Component
public class MultiSocketDisconnectListener {

    private final MultiRoomManager roomManager;

    public MultiSocketDisconnectListener(MultiRoomManager roomManager) {
        this.roomManager = roomManager;
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {

        log.warn("[DISCONNECT EVENT] fired");

        StompHeaderAccessor acc = StompHeaderAccessor.wrap(event.getMessage());
        log.warn("[DISCONNECT] accessor user={}", acc.getUser());

        if (acc.getUser() == null) return;

        Integer userId;
        try {
            userId = Integer.parseInt(acc.getUser().getName());
        } catch (Exception e) {
            return;
        }

        log.warn("[DISCONNECT] userId={}", userId);

        roomManager.leaveByDisconnect(userId);
    }

}

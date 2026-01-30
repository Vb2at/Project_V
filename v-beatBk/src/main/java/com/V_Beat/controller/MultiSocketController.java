package com.V_Beat.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.V_Beat.multi.MultiRoom;
import com.V_Beat.multi.MultiRoomManager;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class MultiSocketController {

    private final MultiRoomManager roomManager;
    private final SimpMessagingTemplate messagingTemplate;

    public MultiSocketController(MultiRoomManager roomManager,
                                 SimpMessagingTemplate messagingTemplate) {
        this.roomManager = roomManager;
        this.messagingTemplate = messagingTemplate;
    }

    /* ================================
       ENTER
       /app/multi/enter
    ================================= */
    @MessageMapping("/multi/enter")
    public void enter(@Payload Map<String, Object> payload,
                      StompHeaderAccessor accessor) {

        String roomId = (String) payload.get("roomId");
        if (roomId == null) return;

        // 세션에 roomId 저장 (disconnect / leave 처리용)
        accessor.getSessionAttributes().put("roomId", roomId);

        log.info("[MULTI ENTER] roomId={}", roomId);
    }

    /* ================================
       READY TOGGLE
       /app/multi/ready
    ================================= */
    @MessageMapping("/multi/ready")
    public void ready(@Payload Map<String, Object> payload, Principal principal) {

        if (principal == null) return;

        String roomId = (String) payload.get("roomId");
        if (roomId == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) return;

        room.toggleReady(userId);

        broadcastRoom(room);

        log.info("[MULTI READY] roomId={} userId={}", roomId, userId);
    }

    /* ================================
       START GAME
       /app/multi/start
    ================================= */
    @MessageMapping("/multi/start")
    public void start(@Payload Map<String, Object> payload, Principal principal) {

        if (principal == null) return;

        String roomId = (String) payload.get("roomId");
        if (roomId == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) return;

        // 방장만 시작 가능
        if (!userId.equals(room.getHostUserId())) return;

        long startAt = System.currentTimeMillis() + 3000;

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + roomId,
            Map.of(
                "type", "START",
                "startAt", startAt
            )
        );

        log.info("[MULTI START] roomId={} startAt={}", roomId, startAt);
    }

    /* ================================
       LEAVE ROOM
       /app/multi/leave
    ================================= */
    @MessageMapping("/multi/leave")
    public void leave(@Payload Map<String, Object> payload, Principal principal) {

        if (principal == null) return;

        String roomId = (String) payload.get("roomId");
        if (roomId == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        roomManager.leaveRoom(roomId, userId);

        log.info("[MULTI LEAVE] roomId={} userId={}", roomId, userId);
        // ROOM_STATE / ROOM_CLOSED 브로드캐스트는
        // roomManager.leaveRoom 내부에서 처리
    }

    /* ================================
       BROADCAST ROOM STATE
    ================================= */
    private void broadcastRoom(MultiRoom room) {

        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "ROOM_STATE");
        msg.put("players", room.getPlayers());

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + room.getRoomId(),
            msg
        );
    }

    private Integer parseUserId(Principal principal) {
        try {
            return Integer.parseInt(principal.getName());
        } catch (Exception e) {
            return null;
        }
    }
}

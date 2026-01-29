package com.V_Beat.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.V_Beat.multi.MultiRoom;
import com.V_Beat.multi.MultiRoomManager;

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
       방 입장 알림
       /app/multi/join
    ================================= */
    @MessageMapping("/multi/join")
    public void join(@Payload Map<String, Object> payload, Principal principal) {

        String roomId = String.valueOf(payload.get("roomId"));
        if (roomId == null) return;

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) return;

        broadcastRoom(room);
    }

    /* ================================
       READY 토글
       /app/multi/ready
    ================================= */
    @MessageMapping("/multi/ready")
    public void ready(@Payload Map<String, Object> payload, Principal principal) {

        String roomId = String.valueOf(payload.get("roomId"));
        if (roomId == null || principal == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) return;

        room.toggleReady(userId);

        broadcastRoom(room);
    }

    /* ================================
       START 요청 (호스트만)
       /app/multi/start
    ================================= */
    @MessageMapping("/multi/start")
    public void start(@Payload Map<String, Object> payload, Principal principal) {

        String roomId = String.valueOf(payload.get("roomId"));
        if (roomId == null || principal == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) return;

        if (!room.getHostUserId().equals(userId)) return;
        if (!room.isAllReady()) return;

        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "START");

        messagingTemplate.convertAndSend(
                "/topic/multi/room/" + roomId,
                msg
        );
    }

    /* ================================
       공통 브로드캐스트
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

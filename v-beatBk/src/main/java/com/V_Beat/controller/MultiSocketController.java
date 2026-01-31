package com.V_Beat.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.V_Beat.dto.MultiScoreMessage;
import com.V_Beat.multi.MultiPlayer;
import com.V_Beat.multi.MultiRoom;
import com.V_Beat.multi.MultiRoomManager;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class MultiSocketController {

    private final MultiRoomManager roomManager;
    private final SimpMessagingTemplate messagingTemplate;

    public MultiSocketController(
        MultiRoomManager roomManager,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.roomManager = roomManager;
        this.messagingTemplate = messagingTemplate;
    }

    /* ======================================================
     * ENTER ROOM  /app/multi/enter
     * ====================================================== */
    @MessageMapping("/multi/enter")
    public void enter(
        @Payload Map<String, Object> payload,
        StompHeaderAccessor accessor,
        Principal principal
    ) {
        if (principal == null) return;

        String roomId = (String) payload.get("roomId");
        if (roomId == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        accessor.getSessionAttributes().put("roomId", roomId);

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) return;

        // ✅ 실제 입장 처리 (핵심)
        MultiPlayer player = new MultiPlayer(
            userId,
            null,   // nickname은 RoomManager / 후속 fetch에서 채움
            null,   // profileImg도 동일
            false
        );

        roomManager.joinRoom(roomId, player);

        // ✅ START 정보가 있으면 함께 전달
        if (room.getStartAt() != null) {
            messagingTemplate.convertAndSend(
                "/topic/multi/room/" + roomId,
                Map.of(
                    "type", "START",
                    "startAt", room.getStartAt()
                )
            );
        }

        // ✅ 항상 최신 ROOM_STATE 브로드캐스트
        broadcastRoom(room);

        log.info("[MULTI ENTER] roomId={} userId={}", roomId, userId);
    }

    /* ======================================================
     * READY TOGGLE  /app/multi/ready
     * ====================================================== */
    @MessageMapping("/multi/ready")
    public void ready(
        @Payload Map<String, Object> payload,
        Principal principal
    ) {
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

    /* ======================================================
     * START GAME  /app/multi/start
     * ====================================================== */
    @MessageMapping("/multi/start")
    public void start(
        @Payload Map<String, Object> payload,
        Principal principal
    ) {
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
        room.setStartAt(startAt);

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + roomId,
            Map.of(
                "type", "START",
                "startAt", startAt
            )
        );

        log.info("[MULTI START] roomId={} startAt={}", roomId, startAt);
    }

    /* ======================================================
     * LEAVE ROOM  /app/multi/leave
     * ====================================================== */
    @MessageMapping("/multi/leave")
    public void leave(
        @Payload Map<String, Object> payload,
        Principal principal
    ) {
        if (principal == null) return;

        String roomId = (String) payload.get("roomId");
        if (roomId == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        roomManager.leaveRoom(roomId, userId);

        log.info("[MULTI LEAVE] roomId={} userId={}", roomId, userId);
    }

    /* ======================================================
     * SCORE SYNC  /app/multi/score
     * ====================================================== */
    @MessageMapping("/multi/score")
    public void score(
        @Payload MultiScoreMessage payload,
        Principal principal
    ) {
        if (principal == null || payload == null) return;

        String roomId = payload.getRoomId();
        if (roomId == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + roomId + "/score",
            Map.of(
                "type", "SCORE",
                "userId", userId,
                "score", payload.getScore(),
                "combo", payload.getCombo(),
                "maxCombo", payload.getMaxCombo()
            )
        );
    }

    /* ======================================================
     * INTERNAL
     * ====================================================== */
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
   
    @MessageMapping("/multi/frame")
    public void frame(
    		
        @Payload Map<String, Object> payload,
        Principal principal
    ) {
    	log.info("[FRAME ENTER]");
        if (principal == null || payload == null) return;

        String roomId = (String) payload.get("roomId");
        String frame = (String) payload.get("frame"); // base64 dataURL
        if (roomId == null || frame == null) return;

        Integer userId = parseUserId(principal);
        if (userId == null) return;

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + roomId + "/frame",
            Map.of(
                "type", "FRAME",
                "userId", userId,
                "frame", frame
            )
        );
    }
    
    

}

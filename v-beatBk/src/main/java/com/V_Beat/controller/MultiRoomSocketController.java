package com.V_Beat.controller;

import com.V_Beat.multi.MultiRoom;
import com.V_Beat.multi.MultiRoomManager;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

@Controller
public class MultiRoomSocketController {

    private final MultiRoomManager roomManager;
    private final SimpMessagingTemplate messagingTemplate;

    public MultiRoomSocketController(
        MultiRoomManager roomManager,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.roomManager = roomManager;
        this.messagingTemplate = messagingTemplate;
    }

    // ✅ 게임 플레이 진입 시 방 상태 요청용
    @MessageMapping("/multi/room/state")
    public void sendRoomState(@Payload Map<String, Object> payload) {

        String roomId = (String) payload.get("roomId");
        if (roomId == null) return;

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) return;

        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "ROOM_STATE");
        msg.put("players", room.getPlayers());

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + roomId,
            msg
        );
    }
}

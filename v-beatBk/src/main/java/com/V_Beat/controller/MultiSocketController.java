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
import com.V_Beat.dto.MultiScoreMessage;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class MultiSocketController {

	private final MultiRoomManager roomManager;
	private final SimpMessagingTemplate messagingTemplate;

	public MultiSocketController(MultiRoomManager roomManager, SimpMessagingTemplate messagingTemplate) {
		this.roomManager = roomManager;
		this.messagingTemplate = messagingTemplate;
	}

	/*
	 * ================================ ENTER /app/multi/enter
	 * =================================
	 */
	@MessageMapping("/multi/enter")
	public void enter(@Payload Map<String, Object> payload, StompHeaderAccessor accessor) {

	    String roomId = (String) payload.get("roomId");
	    if (roomId == null) return;

	    accessor.getSessionAttributes().put("roomId", roomId);

	    MultiRoom room = roomManager.getRoom(roomId);
	    if (room == null) return;

	    // ✅ START 전송 (기존)
	    if (room.getStartAt() != null) {
	        messagingTemplate.convertAndSend(
	            "/topic/multi/room/" + roomId,
	            Map.of("type", "START", "startAt", room.getStartAt())
	        );
	    }

	    // ✅ 이 줄이 핵심 (누락돼 있었음)
	    Map<String, Object> msg = new HashMap<>();
	    msg.put("type", "ROOM_STATE");
	    msg.put("players", room.getPlayers());

	    messagingTemplate.convertAndSend(
	        "/topic/multi/room/" + roomId,
	        msg
	    );

	    log.info("[MULTI ENTER] roomId={}", roomId);
	}

	/*
	 * ================================ READY TOGGLE /app/multi/ready
	 * =================================
	 */
	@MessageMapping("/multi/ready")
	public void ready(@Payload Map<String, Object> payload, Principal principal) {

		if (principal == null)
			return;

		String roomId = (String) payload.get("roomId");
		if (roomId == null)
			return;

		Integer userId = parseUserId(principal);
		if (userId == null)
			return;

		MultiRoom room = roomManager.getRoom(roomId);
		if (room == null)
			return;

		room.toggleReady(userId);

		broadcastRoom(room);

		log.info("[MULTI READY] roomId={} userId={}", roomId, userId);
	}

	/*
	 * ================================ START GAME /app/multi/start
	 * =================================
	 */
	@MessageMapping("/multi/start")
	public void start(@Payload Map<String, Object> payload, Principal principal) {

		if (principal == null)
			return;

		String roomId = (String) payload.get("roomId");
		if (roomId == null)
			return;

		Integer userId = parseUserId(principal);
		if (userId == null)
			return;

		MultiRoom room = roomManager.getRoom(roomId);
		if (room == null)
			return;

		// 방장만 시작 가능
		if (!userId.equals(room.getHostUserId()))
			return;

		long startAt = System.currentTimeMillis() + 3000;
		room.setStartAt(startAt);

		messagingTemplate.convertAndSend("/topic/multi/room/" + roomId, Map.of("type", "START", "startAt", startAt));

		log.info("[MULTI START] roomId={} startAt={}", roomId, startAt);
	}

	/*
	 * ================================ LEAVE ROOM /app/multi/leave
	 * =================================
	 */
	@MessageMapping("/multi/leave")
	public void leave(@Payload Map<String, Object> payload, Principal principal) {

		if (principal == null)
			return;

		String roomId = (String) payload.get("roomId");
		if (roomId == null)
			return;

		Integer userId = parseUserId(principal);
		if (userId == null)
			return;

		roomManager.leaveRoom(roomId, userId);

		log.info("[MULTI LEAVE] roomId={} userId={}", roomId, userId);
		// ROOM_STATE / ROOM_CLOSED 브로드캐스트는
		// roomManager.leaveRoom 내부에서 처리
	}

	/*
	 * ================================ BROADCAST ROOM STATE
	 * =================================
	 */
	private void broadcastRoom(MultiRoom room) {

		Map<String, Object> msg = new HashMap<>();
		msg.put("type", "ROOM_STATE");
		msg.put("players", room.getPlayers());

		messagingTemplate.convertAndSend("/topic/multi/room/" + room.getRoomId(), msg);
	}

	private Integer parseUserId(Principal principal) {
		try {
			return Integer.parseInt(principal.getName());
		} catch (Exception e) {
			return null;
		}
	}

	/*
	 * ================================ SCORE SYNC /app/multi/score
	 * =================================
	 */
	@MessageMapping("/multi/score")
	public void score(@Payload MultiScoreMessage payload, Principal principal) {
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


}

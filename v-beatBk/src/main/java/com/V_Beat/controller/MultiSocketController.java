package com.V_Beat.controller;

import java.security.Principal;
import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.V_Beat.dto.MultiScoreMessage;
import com.V_Beat.multi.MultiRoom;
import com.V_Beat.multi.MultiRoomManager;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@MessageMapping("/multi")
public class MultiSocketController {

	private final MultiRoomManager roomManager;
	private final SimpMessagingTemplate messagingTemplate;

	public MultiSocketController(MultiRoomManager roomManager, SimpMessagingTemplate messagingTemplate) {
		this.roomManager = roomManager;
		this.messagingTemplate = messagingTemplate;
	}

	/* ========================= ENTER ========================= */
	@MessageMapping("/enter")
	public void enter(@Payload Map<String, Object> payload, Principal principal, StompHeaderAccessor accessor) {
		// ===== RX 확인 =====
		log.info("[ENTER RX] payload={} principal={}", payload, principal != null ? principal.getName() : null);

		if (principal == null || payload == null) {
			log.warn("[ENTER ABORT] principal or payload null");
			return;
		}

		String roomId = (String) payload.get("roomId");
		if (roomId == null) {
			log.warn("[ENTER ABORT] roomId null payload={}", payload);
			return;
		}

		Integer userId;
		try {
			userId = Integer.parseInt(principal.getName());
		} catch (Exception e) {
			log.warn("[ENTER ABORT] invalid principal name={}", principal.getName());
			return;
		}

		if (roomManager.isClosed(roomId)) {
			log.warn("[ENTER ABORT] room is closed roomId={}", roomId);
			return;
		}

		MultiRoom room = roomManager.getRoom(roomId);
		if (room == null) {
			log.warn("[ENTER ABORT] room not found roomId={}", roomId);
			return;
		}

		// ===== 세션 attribute =====
		if (accessor != null && accessor.getSessionAttributes() != null) {
			accessor.getSessionAttributes().put("roomId", roomId);
		}

		// ===== JOIN =====
		boolean joined = roomManager.joinRoom(roomId, userId);
		log.info("[ENTER JOIN] roomId={} userId={} joined={} players={}", roomId, userId, joined,
				room.getPlayers().size());

		// ===== HOST 보정 =====
		if (room.getHostUserId() == null && !room.getPlayers().isEmpty()) {
			room.setHostUserId(room.getPlayers().get(0).getUserId());
			log.info("[ENTER HOST FIX] roomId={} newHost={}", roomId, room.getHostUserId());
		}

		// ===== ROOM_STATE TX =====
		var payloadState = room.toRoomStatePayload();
		log.info("[ROOM_STATE TX] dest=/topic/multi/room/{} players={} payload={}", roomId, room.getPlayers().size(),
				payloadState);

		messagingTemplate.convertAndSend("/topic/multi/room/" + roomId, payloadState);

		log.info("[MULTI ENTER DONE] roomId={} userId={} hostUserId={}", roomId, userId, room.getHostUserId());
	}

	/* ========================= READY ========================= */
	@MessageMapping("/ready")
	public void ready(@Payload Map<String, Object> payload, Principal principal) {
		if (principal == null || payload == null)
			return;

		String roomId = (String) payload.get("roomId");
		if (roomId == null)
			return;

		Integer userId;
		try {
			userId = Integer.parseInt(principal.getName());
		} catch (Exception e) {
			return;
		}

		MultiRoom room = roomManager.getRoom(roomId);
		if (room == null)
			return;

		room.toggleReady(userId);

		// READY 반영된 ROOM_STATE 먼저
		messagingTemplate.convertAndSend("/topic/multi/room/" + roomId, room.toRoomStatePayload());

		// 모든 플레이어 READY면 ALL_READY 전송
		if (room.isAllReady()) {
			messagingTemplate.convertAndSend("/topic/multi/room/" + roomId, Map.of("type", "ALL_READY"));
		}

		log.info("[MULTI READY] roomId={} userId={}", roomId, userId);
	}

	/* ========================= START ========================= */
	@MessageMapping("/start")
	public void start(@Payload Map<String, Object> payload, Principal principal) {
		if (principal == null || payload == null)
			return;

		String roomId = (String) payload.get("roomId");
		if (roomId == null)
			return;

		Integer userId;
		try {
			userId = Integer.parseInt(principal.getName());
		} catch (Exception e) {
			return;
		}

		MultiRoom room = roomManager.getRoom(roomId);
		if (room == null)
			return;

		if (room.getHostUserId() == null || !userId.equals(room.getHostUserId()) || !room.isAllReady())
			return;

		long startAt = System.currentTimeMillis() + 3000;
		room.setStartAt(startAt);

		// START 전에 ROOM_STATE 전송
		messagingTemplate.convertAndSend("/topic/multi/room/" + roomId, room.toRoomStatePayload());

		// START 이벤트 전송
		messagingTemplate.convertAndSend("/topic/multi/room/" + roomId, Map.of("type", "START", "startAt", startAt));

		log.info("[MULTI START] roomId={} startAt={}", roomId, startAt);
	}

	/* ========================= SCORE ========================= */
	@MessageMapping("/score")
	public void score(@Payload MultiScoreMessage payload, Principal principal) {
		if (principal == null || payload == null)
			return;

		String roomId = payload.getRoomId();
		if (roomId == null)
			return;

		Integer userId;
		try {
			userId = Integer.parseInt(principal.getName());
		} catch (Exception e) {
			return;
		}

		log.info("[SCORE RX SERVER] roomId={} userId={} score={} combo={} maxCombo={}", roomId, userId,
				payload.getScore(), payload.getCombo(), payload.getMaxCombo());
		
		roomManager.applyScore(roomId, userId, payload.getScore(), payload.getCombo());
		messagingTemplate.convertAndSend("/topic/multi/room/" + roomId + "/score", Map.of("type", "SCORE", "userId",
				userId, "score", payload.getScore(), "combo", payload.getCombo(), "maxCombo", payload.getMaxCombo()));
	}

	/* ========================= RTC RELAY ========================= */
	@MessageMapping("/rtc/offer")
	public void rtcOffer(@Payload Map<String, Object> payload, Principal principal) {
		relayRtc("OFFER", payload, principal);
	}

	@MessageMapping("/rtc/answer")
	public void rtcAnswer(@Payload Map<String, Object> payload, Principal principal) {
		relayRtc("ANSWER", payload, principal);
	}

	@MessageMapping("/rtc/candidate")
	public void rtcCandidate(@Payload Map<String, Object> payload, Principal principal) {
		relayRtc("CANDIDATE", payload, principal);
	}

	private void relayRtc(String type, Map<String, Object> payload, Principal principal) {
		if (principal == null || payload == null)
			return;

		String roomId = (String) payload.get("roomId");
		if (roomId == null)
			return;

		Integer userId;
		try {
			userId = Integer.parseInt(principal.getName());
		} catch (Exception e) {
			return;
		}

		payload.put("type", type);
		payload.put("userId", userId);

		messagingTemplate.convertAndSend("/topic/multi/room/" + roomId + "/rtc", payload);
	}

	@MessageMapping("/multi/ping")
	@SendToUser("/queue/pong")
	public Map<String, Object> ping(Map<String, Object> payload) {
		// 그대로 돌려줌 (ts 기준 RTT 계산용)
		return payload;
	}

}

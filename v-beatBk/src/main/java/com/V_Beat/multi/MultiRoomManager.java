package com.V_Beat.multi;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.V_Beat.ai.service.SongService;
import com.V_Beat.service.UserService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MultiRoomManager {

	private final Map<String, MultiRoom> rooms = new ConcurrentHashMap<>();

	@Autowired
	private SimpMessagingTemplate messagingTemplate;

	@Autowired
	private SongService songService;

	@Autowired
	private UserService userService;

	private final Set<String> closedRooms = ConcurrentHashMap.newKeySet();

	/* ===== 방 생성 ===== */
	public synchronized MultiRoom createRoom(MultiRoom req, Integer hostUserId) {

		var user = userService.findById(hostUserId);
		if (user == null) {
			throw new IllegalStateException("Host user not found: " + hostUserId);
		}

		Integer lengthSec = songService.getSongLengthSec(req.getSongId().longValue());

		String roomId = UUID.randomUUID().toString().substring(0, 8);

		MultiRoom room = new MultiRoom();
		room.setRoomId(roomId);
		room.setRoomName(req.getRoomName());
		room.setHostUserId(hostUserId);

		room.setSongId(req.getSongId());
		room.setSongTitle(req.getSongTitle());
		room.setCoverPath(req.getCoverPath());
		room.setDiff(req.getDiff());
		room.setLengthSec(lengthSec);

		room.setPrivate(Boolean.TRUE.equals(req.isPrivate()));
		room.setMaxPlayers(req.getMaxPlayers() >= 2 ? req.getMaxPlayers() : 2);

		room.getPlayers().add(new MultiPlayer(hostUserId, user.getNickName(), user.getProfileImg(), false));

		rooms.put(roomId, room);
		broadcastRoomList();
		return room;
	}

	/* ===== 방 조회 ===== */
	public MultiRoom getRoom(String roomId) {
		return rooms.get(roomId);
	}

	public Collection<MultiRoom> getAllRooms() {
		return rooms.values();
	}

	/* ===== 방 입장 ===== */
	public synchronized boolean joinRoom(String roomId, Integer userId) {
	    if (closedRooms.contains(roomId))
	        return false;

	    MultiRoom room = rooms.get(roomId);
	    if (room == null || room.isFull())
	        return false;

	    // ✅ 게임 진행 중(START 이후) 입장 차단
	    Long startAt = room.getStartAt();
	    if (startAt != null && System.currentTimeMillis() >= startAt) {
	        return false;
	    }

	    boolean exists = room.getPlayers().stream().anyMatch(p -> p.getUserId().equals(userId));

	    if (!exists) {
	        var user = userService.findById(userId);
	        if (user == null)
	            return false;

	        room.getPlayers().add(new MultiPlayer(userId, user.getNickName(), user.getProfileImg(), false));
	    }

	    broadcastRoom(room);
	    broadcastRoomList();
	    return true;
	}


	/* ===== 방 퇴장 ===== */
	public synchronized boolean leaveRoom(String roomId, Integer userId) {
	    MultiRoom room = rooms.get(roomId);
	    if (room == null)
	        return false;

	    boolean isHostLeaving =
	        room.getHostUserId() != null && room.getHostUserId().equals(userId);

	    // ★★★ 핵심: 알림을 위해 제거 전 목록을 보존 ★★★
	    List<MultiPlayer> beforePlayers =
	        new ArrayList<>(room.getPlayers());

	    // 이후 실제 제거
	    room.getPlayers().removeIf(p -> p.getUserId().equals(userId));

	    // ===== 방 폭파 조건 =====
	    if (isHostLeaving || room.getPlayers().isEmpty()) {

	        // (1) **기존 참여자 전원에게 알림 (나 제외)**
	        for (MultiPlayer p : beforePlayers) {
	            if (!p.getUserId().equals(userId)) {
	                messagingTemplate.convertAndSendToUser(
	                    String.valueOf(p.getUserId()),
	                    "/queue/room-closed",
	                    Map.of("roomId", roomId)
	                );
	            }
	        }

	        // (2) **나간 사람(방장 포함)에게도 반드시 알림**
	        messagingTemplate.convertAndSendToUser(
	            String.valueOf(userId),
	            "/queue/room-closed",
	            Map.of("roomId", roomId)
	        );

	        // (3) 프론트 정리용 공용 토픽
	        messagingTemplate.convertAndSend(
	        	    "/topic/multi/room/" + roomId + "/closed",
	        	    Map.of(
	        	        "type", "ROOM_CLOSED",
	        	        "roomId", roomId,
	        	        "forceLeave", true
	        	    )
	        	);

	        rooms.remove(roomId);
	        closedRooms.add(roomId);
	        broadcastRoomList();
	        return true;
	    }

	    // ===== 일반 퇴장 =====
	    broadcastRoom(room);
	    broadcastRoomList();
	    return false;
	}



	/* ===== ROOM_STATE ===== */
	public void broadcastRoom(MultiRoom room) {
		messagingTemplate.convertAndSend("/topic/multi/room/" + room.getRoomId(), room.toRoomStatePayload());
	}

	/* ===== 방 목록 ===== */
	public void broadcastRoomList() {
		messagingTemplate.convertAndSend("/topic/multi/rooms",
				Map.of("ok", true, "rooms", rooms.values().stream().filter(r -> !r.isPrivate()).toList()));
	}

	public boolean isClosed(String roomId) {
		return closedRooms.contains(roomId);
	}

	public synchronized String leaveByDisconnect(Integer userId) {
	    for (MultiRoom room : rooms.values()) {

	        boolean exists = room.getPlayers()
	                .stream()
	                .anyMatch(p -> p.getUserId().equals(userId));

	        if (!exists) continue;

	        // ===== 핵심 변경 =====
	        // 입장 직후 / 대기 상태의 단순 disconnect는 "방 폭파 금지"
	        // 대신 플레이어만 조용히 제거
	        room.getPlayers().removeIf(p -> p.getUserId().equals(userId));

	        // 방장이 아니라면 → 절대 폭파하지 않음
	        if (!room.getHostUserId().equals(userId)) {
	            broadcastRoom(room);
	            broadcastRoomList();
	            return room.getRoomId();
	        }

	        // 방장이 disconnect면 → 기존 정책대로 폭파 경로로 보냄
	        leaveRoom(room.getRoomId(), userId);
	        return room.getRoomId();
	    }
	    return null;
	}


	public synchronized boolean leaveGameByDisconnect(Integer userId) {
		long now = System.currentTimeMillis();

		for (MultiRoom room : rooms.values()) {

			Long startAt = room.getStartAt();
			if (startAt == null)
				continue;

			// ✅ START 이전이면 게임 이탈 아님
			if (now < startAt)
				continue;

			// ✅ START 직후 유예 구간 (3초)
			// 이 구간의 disconnect는 "정상 화면 전환"으로 간주하고 무시
			if (now - startAt < 3000) {
				log.warn("[DISCONNECT IGNORED] start-transition userId={} roomId={}", userId, room.getRoomId());
				return true; // handled
			}

			boolean exists = room.getPlayers().stream().anyMatch(p -> p.getUserId().equals(userId));

			if (!exists)
				continue;

			// ✅ 여기까지 왔다는 건 "실제 게임 중 이탈"
			String roomId = room.getRoomId();

			log.warn("[GAME LEAVE → ROOM EXPLODE] userId={} roomId={}", userId, roomId);

			// ★ 핵심: 알림만 보내지 말고 실제 방 삭제 경로로 보낸다
			leaveRoom(roomId, userId);

			return true;
		}

		return false;
	}

	public synchronized void applyScore(String roomId, Integer userId, int score, int combo) {
		MultiRoom room = rooms.get(roomId);
		if (room == null)
			return;

		for (MultiPlayer p : room.getPlayers()) {
			if (p.getUserId().equals(userId)) {
				p.setScore(score);
				p.setCombo(combo);
				return;
			}
		}
	}

}

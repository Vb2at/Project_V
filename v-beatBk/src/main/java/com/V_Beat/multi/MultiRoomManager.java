package com.V_Beat.multi;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.V_Beat.ai.service.SongService;

@Component
public class MultiRoomManager {

    private final Map<String, MultiRoom> rooms = new ConcurrentHashMap<>();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SongService songService;

    /* ===== 방 생성 ===== */
    public synchronized MultiRoom createRoom(MultiRoom req, MultiPlayer host) {

        // ✅ 서버에서 곡 길이 단일 소스 확보
    	Integer lengthSec = songService.getSongLengthSec(req.getSongId().longValue());

        String roomId = UUID.randomUUID().toString().substring(0, 8);

        MultiRoom room = new MultiRoom();
        room.setRoomId(roomId);
        room.setRoomName(req.getRoomName());
        room.setHostUserId(host.getUserId());

        room.setSongId(req.getSongId());
        room.setSongTitle(req.getSongTitle());
        room.setCoverPath(req.getCoverPath());
        room.setDiff(req.getDiff());

        // ✅ 여기서 단 한 번만 세팅
        room.setLengthSec(lengthSec);

        room.setPrivate(Boolean.TRUE.equals(req.isPrivate()));
        room.setMaxPlayers(req.getMaxPlayers() > 0 ? req.getMaxPlayers() : 2);

        room.getPlayers().add(host);
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

    /* ===== 방 삭제 ===== */
    public void removeRoom(String roomId) {
        rooms.remove(roomId);
        broadcastRoomList();
    }

    /* ===== 입장 ===== */
    public synchronized boolean joinRoom(String roomId, MultiPlayer player) {
        MultiRoom room = rooms.get(roomId);
        if (room == null || room.isFull()) return false;

        boolean exists = room.getPlayers().stream()
            .anyMatch(p -> p.getUserId().equals(player.getUserId()));

        if (!exists) {
            room.getPlayers().add(player);
        }

        // ✅ 이미 들어와 있어도 무조건 ROOM_STATE 재전송
        broadcastRoom(room);
        broadcastRoomList();

        return true;
    }

    /* ===== 퇴장 ===== */
    public synchronized boolean leaveRoom(String roomId, Integer userId) {
        MultiRoom room = rooms.get(roomId);
        if (room == null) return false;

        boolean isHostLeaving =
            room.getHostUserId() != null && room.getHostUserId().equals(userId);

        var targets = room.getPlayers().stream()
            .map(MultiPlayer::getUserId)
            .toList();

        room.getPlayers().removeIf(p -> p.getUserId().equals(userId));

        // 방장이 나가면 무조건 방 폭파
        if (isHostLeaving) {
            for (Integer uid : targets) {
            	Map<String, Object> closedMsg = new HashMap<>();
            	closedMsg.put("type", "ROOM_CLOSED");

            	messagingTemplate.convertAndSend(
            	    "/user/" + uid + "/queue/room-closed",
            	    closedMsg
            	);
            }

            rooms.remove(roomId);
            broadcastRoomList();
            return true;
        }

        // 방장이 아니어도 마지막 인원이면 방 폭파
        if (room.getPlayers().isEmpty()) {
            rooms.remove(roomId);
            for (Integer uid : targets) {
                messagingTemplate.convertAndSend(
                    "/user/" + uid + "/queue/room-closed",
                    Map.of("type", "ROOM_CLOSED")
                );
            }

            broadcastRoomList();
            return true;
        }

        broadcastRoom(room);
        broadcastRoomList();
        return false;
    }

    /* ===== 브로드캐스트 ===== */
    public void broadcastRoom(MultiRoom room) {
    	
        System.out.println("[DEBUG ROOM_STATE players] " + room.getPlayers());

        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "ROOM_STATE");
        msg.put("players",
        	    room.getPlayers().stream().map(p -> {
        	        Map<String, Object> m = new HashMap<>();
        	        m.put("userId", p.getUserId());
        	        m.put("nickname", p.getNickname());
        	        m.put("profileImg", p.getProfileImg()); // ← null 허용
        	        m.put("score", 0);
        	        m.put("combo", 0);
        	        m.put("maxCombo", 0);
        	        return m;
        	    }).toList()
        	);

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + room.getRoomId(),
            msg
        );
    }

    public void broadcastRoomClosed(String roomId) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "ROOM_CLOSED");

        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + roomId,
            msg
        );
    }

    public void broadcastRoomList() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("ok", true);
        payload.put(
            "rooms",
            rooms.values().stream().filter(r -> !r.isPrivate()).toList()
        );

        messagingTemplate.convertAndSend("/topic/multi/rooms", payload);
    }
    
    
}

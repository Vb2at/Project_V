package com.V_Beat.multi;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.V_Beat.ai.service.SongService;
import com.V_Beat.service.UserService;

@Component
public class MultiRoomManager {

    private final Map<String, MultiRoom> rooms = new ConcurrentHashMap<>();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SongService songService;

    @Autowired
    private UserService userService;

    /* ===== 방 생성 ===== */
    public synchronized MultiRoom createRoom(MultiRoom req, Integer hostUserId) {

        var user = userService.findById(hostUserId);
        if (user == null) {
            throw new IllegalStateException("Host user not found: " + hostUserId);
        }

        Integer lengthSec =
            songService.getSongLengthSec(req.getSongId().longValue());

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
        room.setMaxPlayers(req.getMaxPlayers() > 0 ? req.getMaxPlayers() : 2);

        room.getPlayers().add(
            new MultiPlayer(
                hostUserId,
                user.getNickName(),
                user.getProfileImg(),
                false
            )
        );

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
        MultiRoom room = rooms.get(roomId);
        if (room == null || room.isFull()) return false;

        boolean exists = room.getPlayers().stream()
            .anyMatch(p -> p.getUserId().equals(userId));

        if (!exists) {
            var user = userService.findById(userId);
            if (user == null) return false;

            room.getPlayers().add(
                new MultiPlayer(
                    userId,
                    user.getNickName(),
                    user.getProfileImg(),
                    false
                )
            );
        }

        broadcastRoom(room);
        broadcastRoomList();
        return true;
    }

    /* ===== 방 퇴장 ===== */
    public synchronized boolean leaveRoom(String roomId, Integer userId) {
        MultiRoom room = rooms.get(roomId);
        if (room == null) return false;

        boolean isHostLeaving =
            room.getHostUserId() != null &&
            room.getHostUserId().equals(userId);

        room.getPlayers().removeIf(p -> p.getUserId().equals(userId));

        if (isHostLeaving || room.getPlayers().isEmpty()) {
            messagingTemplate.convertAndSend(
                "/topic/multi/room/" + roomId,
                Map.of("type", "ROOM_CLOSED")
            );
            rooms.remove(roomId);
            broadcastRoomList();
            return true;
        }

        broadcastRoom(room);
        broadcastRoomList();
        return false;
    }

    /* ===== ROOM_STATE ===== */
    public void broadcastRoom(MultiRoom room) {
        messagingTemplate.convertAndSend(
            "/topic/multi/room/" + room.getRoomId(),
            room.toRoomStatePayload()
        );
    }

    /* ===== 방 목록 ===== */
    public void broadcastRoomList() {
        messagingTemplate.convertAndSend(
            "/topic/multi/rooms",
            Map.of(
                "ok", true,
                "rooms", rooms.values().stream()
                    .filter(r -> !r.isPrivate())
                    .toList()
            )
        );
    }
}

package com.V_Beat.multi;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class MultiRoomManager {

    private final Map<String, MultiRoom> rooms = new ConcurrentHashMap<>();

    /* ===== 방 생성 ===== */
    public MultiRoom createRoom(MultiRoom room, MultiPlayer host) {

        String roomId = UUID.randomUUID().toString().substring(0, 8);
        room.setRoomId(roomId);

        room.getPlayers().add(host); // ⭐ host 자동 입장

        rooms.put(roomId, room);
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
    }

    /* ===== 플레이어 관리 ===== */

    public boolean joinRoom(String roomId, MultiPlayer player) {
        MultiRoom room = rooms.get(roomId);
        if (room == null) return false;
        if (room.isFull()) return false;

        boolean exists = room.getPlayers().stream()
                .anyMatch(p -> p.getUserId().equals(player.getUserId()));

        if (exists) return true;

        room.getPlayers().add(player);
        return true;
    }

    public void leaveRoom(String roomId, Integer userId) {
        MultiRoom room = rooms.get(roomId);
        if (room == null) return;

        room.getPlayers().removeIf(p -> p.getUserId().equals(userId));

        if (room.getPlayers().isEmpty()) {
            rooms.remove(roomId);
        }
    }
}

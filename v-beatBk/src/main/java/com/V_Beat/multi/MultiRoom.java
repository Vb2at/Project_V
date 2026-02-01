package com.V_Beat.multi;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MultiRoom {

    private String roomId;
    private Long startAt;

    private Integer hostUserId;
    private String roomName;

    private Integer songId;
    private String songTitle;
    private String coverPath;
    private String diff;
    private int lengthSec;

    private boolean isPrivate;
    private int maxPlayers = 2;

    private List<MultiPlayer> players = new ArrayList<>();

    public boolean isFull() {
        return players.size() >= maxPlayers;
    }

    public void toggleReady(Integer userId) {
        for (MultiPlayer p : players) {
            if (p.getUserId().equals(userId)) {
                p.setReady(!p.isReady());
                return;
            }
        }
    }

    public boolean isAllReady() {
        if (players.size() < maxPlayers) return false;
        for (MultiPlayer p : players) {
            if (!p.isReady()) return false;
        }
        return true;
    }

    public Map<String, Object> toRoomStatePayload() {

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ROOM_STATE");
        payload.put("roomId", roomId);
        payload.put("hostUserId", hostUserId);
        payload.put("songId", songId);
        payload.put("startAt", startAt); // null 허용

        payload.put(
            "players",
            players.stream().map(p -> {
                Map<String, Object> m = new HashMap<>();
                m.put("userId", p.getUserId());
                m.put("nickname", p.getNickname());     // null 허용
                m.put("profileImg", p.getProfileImg()); // null 허용
                m.put("ready", p.isReady());
                return m;
            }).toList()
        );

        return payload;
    }

}

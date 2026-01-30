package com.V_Beat.multi;

import java.util.ArrayList;
import java.util.List;

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

    // ⭐ 곡 정보
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
        if (players.isEmpty()) return false;
        for (MultiPlayer p : players) {
            if (!p.isReady()) return false;
        }
        return true;
    }

}

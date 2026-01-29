package com.V_Beat.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.*;

import com.V_Beat.ai.service.SongService;
import com.V_Beat.dto.Song;
import com.V_Beat.multi.MultiPlayer;
import com.V_Beat.multi.MultiRoom;
import com.V_Beat.multi.MultiRoomManager;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/multi")
public class MultiRoomController {

    private final MultiRoomManager roomManager;
    private final SongService songService;

    public MultiRoomController(MultiRoomManager roomManager, SongService songService) {
        this.roomManager = roomManager;
        this.songService = songService;
    }

    /* ===== 방 생성 ===== */
    @PostMapping("/rooms")
    public Map<String, Object> createRoom(@RequestBody MultiRoom req, HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        Integer userId = (Integer) session.getAttribute("loginUserId");
        String nick = (String) session.getAttribute("loginUserNickName");

        if (userId == null) {
            res.put("ok", false);
            res.put("message", "로그인 필요");
            return res;
        }

        if (req.getSongId() == null) {
            res.put("ok", false);
            res.put("message", "곡 정보 없음");
            return res;
        }

        Song song = songService.getSong(req.getSongId().longValue());
        if (song == null) {
            res.put("ok", false);
            res.put("message", "곡을 찾을 수 없습니다");
            return res;
        }

        // ⭐ 곡 정보 채우기
        req.setSongTitle(song.getTitle());
        req.setDiff(song.getDiff());
        req.setLengthSec(parseDurationToSec(song.getDuration()));
        req.setCoverPath(song.getCoverPath());
        req.setHostUserId(userId);

        MultiPlayer host = new MultiPlayer(userId, nick, false);
        MultiRoom room = roomManager.createRoom(req, host);

        res.put("ok", true);
        res.put("roomId", room.getRoomId());
        res.put("room", room);
        return res;
    }

    /* ===== 방 정보 조회 ===== */
    @GetMapping("/rooms/{roomId}")
    public Map<String, Object> getRoom(@PathVariable String roomId) {

        Map<String, Object> res = new HashMap<>();

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) {
            res.put("ok", false);
            res.put("message", "방 없음");
            return res;
        }

        res.put("ok", true);
        res.put("room", room);
        res.put("players", room.getPlayers());
        return res;
    }

    /* ===== 방 목록 조회 ===== */
    @GetMapping("/rooms")
    public Map<String, Object> getRooms() {

        Map<String, Object> res = new HashMap<>();

        res.put("ok", true);
        res.put("rooms", roomManager.getAllRooms());

        return res;
    }

    
    /* ===== duration → sec ===== */
    private int parseDurationToSec(String duration) {
        if (duration == null || !duration.contains(":")) return 0;

        try {
            String[] parts = duration.split(":");
            int m = Integer.parseInt(parts[0]);
            int s = Integer.parseInt(parts[1]);
            return m * 60 + s;
        } catch (Exception e) {
            return 0;
        }
    }
    
}

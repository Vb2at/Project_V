package com.V_Beat.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.*;

import com.V_Beat.ai.service.SongService;
import com.V_Beat.dto.Song;
import com.V_Beat.dto.User;
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
    public Map<String, Object> createRoom(
        @RequestBody MultiRoom req,
        HttpSession session
    ) {
        Map<String, Object> res = new HashMap<>();

        User user = (User) session.getAttribute("loginUser");
        if (user == null) {
            res.put("ok", false);
            res.put("reason", "LOGIN_REQUIRED");
            return res;
        }

        if (req.getSongId() == null) {
            res.put("ok", false);
            res.put("reason", "INVALID_REQUEST");
            return res;
        }

        Song song = songService.getSong(req.getSongId().longValue());
        if (song == null) {
            res.put("ok", false);
            res.put("reason", "SONG_NOT_FOUND");
            return res;
        }

        // 🔹 곡 정보 보정
        req.setSongTitle(song.getTitle().replaceAll("(?i)\\.mp3$", ""));
        req.setDiff(song.getDiff());
        req.setLengthSec(parseDurationToSec(song.getDuration()));
        req.setCoverPath("/api/songs/" + song.getId() + "/cover");

        MultiRoom room = roomManager.createRoom(req, user.getId());

        res.put("ok", true);
        res.put("room", room);
        res.put("roomId", room.getRoomId());
        return res;
    }

    /* ===== 방 단건 조회 ===== */
    @GetMapping("/rooms/{roomId}")
    public Map<String, Object> getRoom(
        @PathVariable String roomId,
        HttpSession session
    ) {
        Map<String, Object> res = new HashMap<>();

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) {
            res.put("ok", false);
            res.put("reason", "ROOM_NOT_FOUND");
            return res;
        }

        User user = (User) session.getAttribute("loginUser");

        res.put("ok", true);
        res.put("room", room);
        res.put("players", room.getPlayers());
        res.put("myUserId", user != null ? user.getId() : null);
        return res;
    }

    /* ===== 방 목록 조회 ===== */
    @GetMapping("/rooms")
    public Map<String, Object> getRooms() {
        Map<String, Object> res = new HashMap<>();

        res.put("ok", true);
        res.put(
            "rooms",
            roomManager.getAllRooms().stream()
                .filter(r -> !r.isPrivate())
                .toList()
        );
        return res;
    }

    /* ===== 방 입장 (정원 초과 차단 포함) ===== */
    @PostMapping("/rooms/{roomId}/join")
    public Map<String, Object> joinRoom(
        @PathVariable String roomId,
        HttpSession session
    ) {
        Map<String, Object> res = new HashMap<>();

        User user = (User) session.getAttribute("loginUser");
        if (user == null) {
            res.put("ok", false);
            res.put("reason", "LOGIN_REQUIRED");
            return res;
        }

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) {
            res.put("ok", false);
            res.put("reason", "ROOM_NOT_FOUND");
            return res;
        }

        // ★★★ 서버 기준 정원 초과 차단 ★★★
        if (room.getPlayers().size() >= room.getMaxPlayers()) {
            res.put("ok", false);
            res.put("reason", "ROOM_FULL");
            return res;
        }

        boolean ok = roomManager.joinRoom(roomId, user.getId());
        if (!ok) {
            res.put("ok", false);
            res.put("reason", "JOIN_FAILED");
            return res;
        }

        res.put("ok", true);
        return res;
    }

    /* ===== duration → sec ===== */
    private int parseDurationToSec(String duration) {
        try {
            String[] p = duration.split(":");
            return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
        } catch (Exception e) {
            return 0;
        }
    }
}

// src/main/java/com/V_Beat/controller/MultiRoomController.java
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
            return res;
        }

        Song song = songService.getSong(req.getSongId().longValue());
        if (song == null) {
            res.put("ok", false);
            return res;
        }

        req.setSongTitle(song.getTitle().replaceAll("(?i)\\.mp3$", ""));
        req.setDiff(song.getDiff());
        req.setLengthSec(parseDurationToSec(song.getDuration()));
        req.setCoverPath("/api/songs/" + song.getId() + "/cover");

        MultiPlayer host = new MultiPlayer(userId, nick, false);
        MultiRoom room = roomManager.createRoom(req, host);

        res.put("ok", true);
        res.put("room", room);
        res.put("roomId", room.getRoomId());
        return res;
    }

    /* ===== 방 단건 조회 ===== */
    @GetMapping("/rooms/{roomId}")
    public Map<String, Object> getRoom(@PathVariable String roomId, HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        MultiRoom room = roomManager.getRoom(roomId);
        if (room == null) {
            res.put("ok", false);
            return res;
        }

        res.put("ok", true);
        res.put("room", room);
        res.put("players", room.getPlayers());
        res.put("myUserId", session.getAttribute("loginUserId"));
        return res;
    }

    /* ===== 방 목록 조회 (❗ 누락돼 있었음) ===== */
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

    /* ===== 방 입장 ===== */
    @PostMapping("/rooms/{roomId}/join")
    public Map<String, Object> joinRoom(@PathVariable String roomId, HttpSession session) {

        Map<String, Object> res = new HashMap<>();

        Integer userId = (Integer) session.getAttribute("loginUserId");
        String nick = (String) session.getAttribute("loginUserNickName");

        if (userId == null) {
            res.put("ok", false);
            return res;
        }

        MultiPlayer p = new MultiPlayer(userId, nick, false);
        boolean ok = roomManager.joinRoom(roomId, p);

        res.put("ok", ok);
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

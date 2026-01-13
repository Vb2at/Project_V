package com.V_Beat.controller;

import org.springframework.web.bind.annotation.*;

import com.V_Beat.service.DuelService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/duel")
public class DuelController {

    private final DuelService duelService;

    public DuelController(DuelService duelService) {
        this.duelService = duelService;
    }

    private Integer getLoginUserId(HttpSession session) {
        return (Integer) session.getAttribute("loginUserId");
    }

    // 대결 초대
    @PostMapping("/invite")
    public String invite(@RequestParam int targetId,
                         @RequestParam(required = false) String message,
                         HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        return duelService.inviteDuel(myId, targetId, message);
    }

    // 수락 (id = DuelInvite.id)
    @PostMapping("/accept")
    public String accept(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        return duelService.acceptDuelInvite(myId, id);
    }

    // 거절
    @PostMapping("/reject")
    public String reject(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        return duelService.rejectDuelInvite(myId, id);
    }
}

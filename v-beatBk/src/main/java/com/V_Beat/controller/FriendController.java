package com.V_Beat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.*;

import com.V_Beat.dto.FriendDto;
import com.V_Beat.dto.FriendRequestDto;
import com.V_Beat.service.FriendService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/friend")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    private Integer getLoginUserId(HttpSession session) {
        return (Integer) session.getAttribute("loginUserId");
    }

    // 친구 요청 (keyword = email or nickName)
    @PostMapping("/request")
    public Map<String, Object> request(@RequestParam String keyword, HttpSession session) {
        Map<String, Object> res = new HashMap<>();
        Integer myId = getLoginUserId(session);
        if (myId == null) {
            res.put("ok", false);
            res.put("message", "needLogin");
            return res;
        }

        String result = friendService.sendFriendRequest(myId, keyword);
        res.put("ok", "success".equals(result));
        res.put("message", result);
        return res;
    }

    // 받은 요청 목록
    @GetMapping("/requests")
    public Object received(HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        List<FriendRequestDto> list = friendService.getReceivedFriendRequests(myId);
        return list;
    }

    // 보낸 요청 목록
    @GetMapping("/sent")
    public Object sent(HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        List<FriendRequestDto> list = friendService.getSentFriendRequests(myId);
        return list;
    }

    // 친구 목록
    @GetMapping("/list")
    public Object list(HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        List<FriendDto> list = friendService.getFriendList(myId);
        return list;
    }

    // 수락 (id = FriendRequest.id)
    @PostMapping("/accept")
    public String accept(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        return friendService.acceptFriendRequest(myId, id);
    }

    // 거절
    @PostMapping("/reject")
    public String reject(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        return friendService.rejectFriendRequest(myId, id);
    }

    // 취소
    @PostMapping("/cancel")
    public String cancel(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        return friendService.cancelFriendRequest(myId, id);
    }

    // 친구 삭제
    @PostMapping("/delete")
    public String delete(@RequestParam int targetId, HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return "needLogin";
        return friendService.deleteFriend(myId, targetId);
    }
}

package com.V_Beat.controller;

import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.V_Beat.dto.FriendRequest;
import com.V_Beat.dto.Req;
import com.V_Beat.service.FriendService;

@Controller
public class FriendController {

    private final FriendService friendService;
    private final Req req;

    public FriendController(FriendService friendService, Req req) {
        this.friendService = friendService;
        this.req = req;
    }

    // 친구 페이지
    @GetMapping("/user/friend")
    public String page() {
        return "user/friend/list";
    }

    // 친구 요청 보내기 (keyword: email or nickName)
    @PostMapping("/user/friend/send")
    @ResponseBody
    public String send(String keyword) {
        if (req.getLoginMember() == null) return "needLogin";
        return friendService.sendRequest(req.getLoginMemberId(), keyword);
    }

    // 내가 받은 요청 목록
    @GetMapping("/user/friend/received")
    @ResponseBody
    public Object received() {
        if (req.getLoginMember() == null) return "needLogin";
        List<FriendRequest> list = friendService.received(req.getLoginMemberId());
        return list;
    }

    // 내가 보낸 요청 목록
    @GetMapping("/user/friend/sent")
    @ResponseBody
    public Object sent() {
        if (req.getLoginMember() == null) return "needLogin";
        List<FriendRequest> list = friendService.sent(req.getLoginMemberId());
        return list;
    }

    // 친구 요청 수락
    @PostMapping("/user/friend/accept")
    @ResponseBody
    public String accept(int requestId) {
        if (req.getLoginMember() == null) return "needLogin";
        if (requestId <= 0) return "badRequest";
        return friendService.accept(req.getLoginMemberId(), requestId);
    }

    // 친구 요청 거절
    @PostMapping("/user/friend/reject")
    @ResponseBody
    public String reject(int requestId) {
        if (req.getLoginMember() == null) return "needLogin";
        if (requestId <= 0) return "badRequest";
        return friendService.reject(req.getLoginMemberId(), requestId);
    }

    // 친구 삭제(언프렌드) - Friend 테이블 + FriendRequest(status=1) 같이 삭제
    @PostMapping("/user/friend/delete")
    @ResponseBody
    public String delete(int targetUserId) {
        if (req.getLoginMember() == null) return "needLogin";
        if (targetUserId <= 0) return "badRequest";
        return friendService.deleteFriend(req.getLoginMemberId(), targetUserId);
    }

    // 친구 목록
    @GetMapping("/user/friend/list")
    @ResponseBody
    public Object list() {
        if (req.getLoginMember() == null) return "needLogin";
        List<FriendRequest> list = friendService.list(req.getLoginMemberId());
        return list;
    }
}

package com.V_Beat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.*;

import com.V_Beat.dto.PrivateMessageDto;
import com.V_Beat.service.PrivateMessageService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/messages")
public class PrivateMessageController {

    private final PrivateMessageService service;

    public PrivateMessageController(PrivateMessageService service) {
        this.service = service;
    }

    private Integer getLoginUserId(HttpSession session) {
        Object v = session.getAttribute("loginUserId");
        return (v instanceof Integer) ? (Integer) v : null;
    }

    @GetMapping("/inbox")
    public List<PrivateMessageDto> inbox(HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return List.of();
        return service.inbox(myId);
    }

    @GetMapping("/sent")
    public List<PrivateMessageDto> sent(HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return List.of();
        return service.sent(myId);
    }

    @GetMapping("/detail")
    public PrivateMessageDto detail(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        if (myId == null) return null;
        return service.detail(myId, id);
    }

    // ✅ unreadCount는 이거 하나만 유지 (응답 포맷 통일: ok + count)
    @GetMapping("/unread-count")
    public Map<String, Object> unreadCount(HttpSession session) {
        Integer myId = getLoginUserId(session);
        Map<String, Object> res = new HashMap<>();

        if (myId == null) {
            res.put("ok", false);
            res.put("count", 0);
            return res;
        }

        res.put("ok", true);
        res.put("count", service.unreadCount(myId));
        return res;
    }

    @PostMapping("/send")
    public Map<String, Object> send(@RequestParam String toNickName,
                                    @RequestParam(required = false) String title,
                                    @RequestParam String content,
                                    HttpSession session) {
        Integer myId = getLoginUserId(session);
        Map<String, Object> res = new HashMap<>();

        if (myId == null) {
            res.put("ok", false);
            res.put("message", "needLogin");
            return res;
        }

        String result = service.sendByNick(myId, toNickName, title, content);
        res.put("ok", "success".equals(result));
        res.put("message", result);
        return res;
    }

    @PostMapping("/read")
    public Map<String, Object> read(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        Map<String, Object> res = new HashMap<>();

        if (myId == null) {
            res.put("ok", false);
            res.put("message", "needLogin");
            return res;
        }

        String result = service.markRead(myId, id);
        res.put("ok", "success".equals(result));
        res.put("message", result);
        return res;
    }

    @PostMapping("/delete")
    public Map<String, Object> delete(@RequestParam int id, HttpSession session) {
        Integer myId = getLoginUserId(session);
        Map<String, Object> res = new HashMap<>();

        if (myId == null) {
            res.put("ok", false);
            res.put("message", "needLogin");
            return res;
        }

        String result = service.deleteInbox(myId, id);
        res.put("ok", "success".equals(result));
        res.put("message", result);
        return res;
    }
}

package com.V_Beat.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.V_Beat.dao.PrivateMessageDao;
import com.V_Beat.dto.MessageEvent;
import com.V_Beat.dto.PrivateMessageDto;

@Service
public class PrivateMessageService {

    private final PrivateMessageDao dao;
    private final SimpMessagingTemplate messagingTemplate;

    public PrivateMessageService(PrivateMessageDao dao,
                                 SimpMessagingTemplate messagingTemplate) {
        this.dao = dao;
        this.messagingTemplate = messagingTemplate;
    }

    // =========================
    // ✅ 개인 알림 전송 (알림 전용)
    // - destination: /user/queue/notify
    // - 프론트는 /user/queue/notify 구독
    // =========================
    private void notifyToUser(int toUserId, Object payload) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(toUserId),   // Principal name == userId
                "/queue/notify",
                payload
        );
    }

    // =========================
    // ✅ 받은/보낸 목록
    // =========================
    public List<PrivateMessageDto> inbox(int myId) {
        return dao.findInbox(myId);
    }

    public List<PrivateMessageDto> sent(int myId) {
        return dao.findSent(myId);
    }

    // =========================
    // ✅ 상세 조회
    // - 본인(from 또는 to)만 조회 가능
    // =========================
    public PrivateMessageDto detail(int myId, int messageId) {
        PrivateMessageDto msg = dao.findById(messageId);
        if (msg == null) return null;

        if (msg.getFromUserId() != myId && msg.getToUserId() != myId) return null;
        return msg;
    }

    // =========================
    // ✅ 안읽은 개수
    // =========================
    public int unreadCount(int myId) {
        return dao.countUnread(myId);
    }

    // =========================
    // ✅ 닉네임 기반 쪽지 전송
    // - 전송 성공 시: 받는 사람에게 WS 알림
    // =========================
    public String sendByNick(int myId, String toNickName, String title, String content) {

        if (myId == 0) return "needLogin";

        String toNick = (toNickName == null) ? "" : toNickName.trim();
        if (toNick.isEmpty()) return "emptyTo";

        String body = (content == null) ? "" : content.trim();
        if (body.isEmpty()) return "emptyContent";

        // title은 null 허용, 공백이면 null 처리
        String t = (title == null) ? null : title.trim();
        if (t != null && t.isEmpty()) t = null;

        Integer toUserId = dao.findUserIdByNick(toNick);
        if (toUserId == null) return "notFound";
        if (toUserId == myId) return "self";

        int ok = dao.insert(myId, toUserId, t, body);
        if (ok != 1) return "fail";

        // =========================
        // ✅ WS 알림 전송
        // =========================
        String fromNick = dao.findNickById(myId);

        Map<String, Object> data = new HashMap<>();
        data.put("fromUserId", myId);
        data.put("fromNick", fromNick != null ? fromNick : ("user#" + myId));
        data.put("preview", body.length() > 20 ? body.substring(0, 20) + "..." : body);

        // 👉 프론트에서 payload.type === 'NEW_MESSAGE'
        notifyToUser(
                toUserId,
                new MessageEvent<>("NEW_MESSAGE", data)
        );

        return "success";
    }

    // =========================
    // ✅ 읽음 처리 (받은 사람만 가능)
    // =========================
    public String markRead(int myId, int messageId) {
        int ok = dao.markRead(messageId, myId);
        return ok == 1 ? "success" : "fail";
    }

    // =========================
    // ✅ 받은 쪽지 삭제 (받은 사람만 가능)
    // =========================
    public String deleteInbox(int myId, int messageId) {
        int ok = dao.deleteInbox(messageId, myId);
        return ok == 1 ? "success" : "fail";
    }
}

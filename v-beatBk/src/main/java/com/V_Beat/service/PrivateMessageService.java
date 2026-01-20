package com.V_Beat.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.V_Beat.dao.PrivateMessageDao;
import com.V_Beat.dto.FilterResult;
import com.V_Beat.dto.MessageEvent;
import com.V_Beat.dto.PrivateMessageDto;

@Service
public class PrivateMessageService {

    private final PrivateMessageDao dao;
    private final SimpMessagingTemplate messagingTemplate;

    // ✅ Matgim 제거 → txt 기반 욕설 필터 서비스로 교체
    private final ProfanityFilterService profanityFilterService;

    // ✅ 길이 제한(원하면 숫자 조정)
    private static final int PM_TITLE_MAX = 120;
    private static final int PM_CONTENT_MAX = 2000;
    private static final int PREVIEW_MAX = 20;

    public PrivateMessageService(PrivateMessageDao dao,
                                 SimpMessagingTemplate messagingTemplate,
                                 ProfanityFilterService profanityFilterService) {
        this.dao = dao;
        this.messagingTemplate = messagingTemplate;
        this.profanityFilterService = profanityFilterService;
    }

    // ✅ 개인 알림 전송 (/user/queue/notify)
    private void notifyToUser(int toUserId, Object payload) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(toUserId),
                "/queue/notify",
                payload
        );
    }

    public List<PrivateMessageDto> inbox(int myId) {
        return dao.findInbox(myId);
    }

    public List<PrivateMessageDto> sent(int myId) {
        return dao.findSent(myId);
    }

    public PrivateMessageDto detail(int myId, int messageId) {
        PrivateMessageDto msg = dao.findById(messageId);
        if (msg == null) return null;
        if (msg.getFromUserId() != myId && msg.getToUserId() != myId) return null;
        return msg;
    }

    public int unreadCount(int myId) {
        return dao.countUnread(myId);
    }

    public String sendByNick(int myId, String toNickName, String title, String content) {

        if (myId <= 0) return "needLogin";

        String toNick = (toNickName == null) ? "" : toNickName.trim();
        if (toNick.isEmpty()) return "emptyTo";

        String body = (content == null) ? "" : content.trim();
        if (body.isEmpty()) return "emptyContent";
        if (body.length() > PM_CONTENT_MAX) return "contentTooLong";

        String t = (title == null) ? null : title.trim();
        if (t != null && t.isEmpty()) t = null;
        if (t != null && t.length() > PM_TITLE_MAX) t = t.substring(0, PM_TITLE_MAX);

        Integer toUserId = dao.findUserIdByNick(toNick);
        if (toUserId == null) return "notFound";
        if (toUserId == myId) return "self";

        // ✅ 욕설 마스킹 (LOCAL_DB)
        FilterResult fr = profanityFilterService.mask(body);

        String maskedBody = (fr != null && fr.getContent() != null) ? fr.getContent() : body;
        boolean filtered = (fr != null) && fr.isFiltered();

        String filterType = null;
        if (fr != null && fr.getFilterType() != null) {
            String ft = fr.getFilterType().trim();
            if (!ft.isEmpty()) filterType = ft;
        }

        // ✅ DB 저장 (filtered, filterType 저장)
        int ok = dao.insert(myId, toUserId, t, maskedBody, filtered, filterType);
        if (ok != 1) return "fail";

        // ✅ WS 알림
        String fromNick = dao.findNickById(myId);

        Map<String, Object> data = new HashMap<>();
        data.put("fromUserId", myId);
        data.put("fromNick", (fromNick != null && !fromNick.isBlank()) ? fromNick : ("user#" + myId));

        String preview = (maskedBody == null) ? "" : maskedBody;
        if (preview.length() > PREVIEW_MAX) preview = preview.substring(0, PREVIEW_MAX) + "...";
        data.put("preview", preview);

        data.put("filtered", filtered);
        data.put("filterType", filterType);

        notifyToUser(toUserId, new MessageEvent<>("NEW_MESSAGE", data));

        return "success";
    }

    public String markRead(int myId, int messageId) {
        int ok = dao.markRead(messageId, myId);
        return ok == 1 ? "success" : "fail";
    }

    public String deleteInbox(int myId, int messageId) {
        int ok = dao.deleteInbox(messageId, myId);
        return ok == 1 ? "success" : "fail";
    }
}

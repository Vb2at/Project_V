package com.V_Beat.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class PrivateMessageNotifyService {

    private final SimpMessagingTemplate template;

    public PrivateMessageNotifyService(SimpMessagingTemplate template) {
        this.template = template;
    }

    public void notifyNewPrivateMessage(int toUserId, int fromUserId, int messageId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "NEW_MESSAGE");
        payload.put("messageId", messageId);
        payload.put("fromUserId", fromUserId);

        // ✅ 핵심: convertAndSendToUser
        template.convertAndSendToUser(
            String.valueOf(toUserId),
            "/queue/notify",
            payload
        );
    }
}

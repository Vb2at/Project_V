package com.V_Beat.listener;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.V_Beat.event.OnlineUsersEvent;

@Component
public class OnlineUsersEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    public OnlineUsersEventListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handle(OnlineUsersEvent e) {
        messagingTemplate.convertAndSend("/topic/online-users", e.getOnlineUsers());
    }
}

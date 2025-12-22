package com.V_Beat.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.V_Beat.dto.Message;
import com.V_Beat.service.BattleSessionService;
import com.V_Beat.service.MessageService;

@Controller
public class MessageController {

    private MessageService messageService;
    private SimpMessagingTemplate simpMessagingTemplate;
    private BattleSessionService battleSessionService;
    
    public MessageController(BattleSessionService battleSessionService, 
                           MessageService messageService, 
                           SimpMessagingTemplate simpMessagingTemplate) {
        this.messageService = messageService;
        this.simpMessagingTemplate = simpMessagingTemplate;
        this.battleSessionService = battleSessionService;
    }

    // 메시지 전송 (관전자 채팅)
    @MessageMapping("/chat")
    public void sendMessage(Message message) {
        // DB에 메시지 저장
        messageService.createMessage(
            message.getChannelId(), 
            message.getUserId(), 
            message.getContent(),
            message.getType()
        );

        // 해당 채널을 구독 중인 모든 클라이언트에게 브로드캐스트
        simpMessagingTemplate.convertAndSend(
            "/topic/channel/" + message.getChannelId(),
            message
        );
    }
    
    // 관전자 입장
    @MessageMapping("/channel/join")
    public void joinChannel(Map<String, Object> payload) {
        int channelId = (int) payload.get("channelId");
        int userId = (int) payload.get("userId");
        String nickName = (String) payload.get("nickName");
        
        battleSessionService.addUser(channelId, userId);
        
        Map<String, Object> message = new HashMap<>();
        message.put("type", "system");
        message.put("content", nickName + "님이 입장했습니다.");
        message.put("channelId", channelId);
        
        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, message);
    }
    
    // 관전자 퇴장
    @MessageMapping("/channel/leave")
    public void leaveChannel(Map<String, Object> payload) {
        int channelId = (int) payload.get("channelId");
        int userId = (int) payload.get("userId");
        String nickName = (String) payload.get("nickName");
        
        battleSessionService.removeUser(channelId, userId);
        
        Map<String, Object> message = new HashMap<>();
        message.put("type", "system");
        message.put("content", nickName + "님이 퇴장했습니다.");
        message.put("channelId", channelId);
        
        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, message);
    }
    
    // 초대 알림 (친구 요청 + 대결 초대)
    public void InviteNoti(int userId) {
        simpMessagingTemplate.convertAndSend("/topic/user/" + userId + "/invites", "new_invite");
    }
}
package com.V_Beat.service;


import org.springframework.stereotype.Service;

import com.V_Beat.dao.MessageDao;


@Service
public class MessageService {
    
    private MessageDao messageDao;
    
    public MessageService(MessageDao messageDao) {
        this.messageDao = messageDao;
    }
    
    // ===== 메시지 생성 =====
    // WebSocket으로 메시지 수신 시 호출
    // type: 0=일반 메시지, 1=시스템 메시지(입장/퇴장 등)
    public void createMessage(int channelId, int userId, String content, int type) {
        this.messageDao.createMessage(channelId, userId, content, type);
    }
}
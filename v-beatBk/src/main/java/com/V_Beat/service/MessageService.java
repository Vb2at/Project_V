package com.V_Beat.service;

import org.springframework.stereotype.Service;

import com.V_Beat.dao.MessageDao;

@Service
public class MessageService {

    private final MessageDao messageDao;

    public MessageService(MessageDao messageDao) {
        this.messageDao = messageDao;
    }

    // ✅ contentHash 제거 (원래 형태)
    public void createMessage(int channelId, int userId, String content, int type) {
        this.messageDao.createMessage(channelId, userId, content, type);
    }
}

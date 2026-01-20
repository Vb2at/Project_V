package com.V_Beat.service;

import org.springframework.stereotype.Service;

import com.V_Beat.dao.MessageDao;

@Service
public class MessageService {

    private final MessageDao messageDao;

    public MessageService(MessageDao messageDao) {
        this.messageDao = messageDao;
    }

    // ✅ 기존 그대로 (필요한 곳 있으면 유지)
    public void createMessage(int channelId, int userId, String content, int type) {
        this.messageDao.createMessage(channelId, userId, content, type);
    }

    /**
     * ✅ 채팅 저장 정책 메서드 (완성형)
     * - DB에는 "마스킹된 내용(maskedContent)" 저장
     * - filtered/filterType도 함께 저장
     */
    public void createChatMessage(
            int channelId,
            int userId,
            String maskedContent,
            boolean filtered,
            String filterType,
            int type
    ) {
        String ft = (filterType == null || filterType.isBlank()) ? null : filterType.trim();
        this.messageDao.createMessageWithFilter(channelId, userId, maskedContent, type, filtered, ft);
    }
}

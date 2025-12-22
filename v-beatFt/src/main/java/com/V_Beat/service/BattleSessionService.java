package com.V_Beat.service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class BattleSessionService {
    
    // channelId -> Map<userId, isEditing>
    private Map<Integer, Map<Integer, Boolean>> channelUsers = new ConcurrentHashMap<>();
    
    // 사용자 추가
    public void addUser(int channelId, int userId) {
        channelUsers.computeIfAbsent(channelId, k -> new ConcurrentHashMap<>()).put(userId, false);
    }
    
    // 사용자 제거
    public void removeUser(int channelId, int userId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        if (users != null) {
            users.remove(userId);
        }
    }
    
    // 편집 상태 업데이트
    public void setEditing(int channelId, int userId, boolean isEditing) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        if (users != null && users.containsKey(userId)) {
            users.put(userId, isEditing);
        }
    }
    
    // 채널의 모든 접속자 정보 조회
    public Map<Integer, Boolean> getChannelUsers(int channelId) {
        return channelUsers.getOrDefault(channelId, new HashMap<>());
    }
}
package com.V_Beat.service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class BattleSessionService {

    // channelId -> Map<userId, isEditing> (플레이어/참가자)
    private final Map<Integer, Map<Integer, Boolean>> channelUsers = new ConcurrentHashMap<>();

    // channelId -> Set<userId> (관전자)
    private final Map<Integer, Set<Integer>> channelSpectators = new ConcurrentHashMap<>();

    // ✅ 추가: channelId -> 게임 진행 중 여부
    private final Map<Integer, Boolean> channelPlaying = new ConcurrentHashMap<>();

    // =========================
    // 플레이어 관리
    // =========================
    public void addUser(int channelId, int userId) {
        channelUsers.computeIfAbsent(channelId, k -> new ConcurrentHashMap<>()).put(userId, false);
        // (선택) 방이 생기면 기본은 게임 전 상태
        channelPlaying.putIfAbsent(channelId, false);
    }

    public void removeUser(int channelId, int userId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        if (users != null) {
            users.remove(userId);

            // 채널에 플레이어가 0명이면 채널 정리
            if (users.isEmpty()) {
                channelUsers.remove(channelId);
                channelPlaying.remove(channelId); // ✅ 같이 제거(메모리 정리)
            }
        }

        // 관전자에서도 제거(안전장치)
        Set<Integer> specs = channelSpectators.get(channelId);
        if (specs != null) {
            specs.remove(userId);

            // ✅ 중복 if 제거하고 1번만 처리
            if (specs.isEmpty()) {
                channelSpectators.remove(channelId);
            }
        }
    }

    // 편집 상태 업데이트
    public void setEditing(int channelId, int userId, boolean isEditing) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        if (users != null && users.containsKey(userId)) {
            users.put(userId, isEditing);
        }
    }

    // 채널의 플레이어 정보 조회
    public Map<Integer, Boolean> getChannelUsers(int channelId) {
        return channelUsers.getOrDefault(channelId, new HashMap<>());
    }

    // =========================
    // 관전자 관리
    // =========================
    public void spectatorJoin(int channelId, int userId) {
        channelSpectators.computeIfAbsent(channelId, k -> ConcurrentHashMap.newKeySet()).add(userId);
    }

    public void spectatorLeave(int channelId, int userId) {
        Set<Integer> set = channelSpectators.get(channelId);
        if (set != null) {
            set.remove(userId);

            // ✅ 중복 if 제거하고 1번만 처리
            if (set.isEmpty()) {
                channelSpectators.remove(channelId);
            }
        }
    }

    public boolean isSpectator(int channelId, int userId) {
        Set<Integer> set = channelSpectators.get(channelId);
        return set != null && set.contains(userId);
    }

    // 연결 끊김 대비: 모든 관전 채널에서 제거
    public void spectatorLeaveAll(int userId) {
        for (Iterator<Map.Entry<Integer, Set<Integer>>> it = channelSpectators.entrySet().iterator(); it.hasNext();) {
            Map.Entry<Integer, Set<Integer>> entry = it.next();
            Set<Integer> set = entry.getValue();

            set.remove(userId);

            if (set.isEmpty()) {
                it.remove();
            }
        }
    }

    // 게임 상태 관리
    public void startGame(int channelId) {
        channelPlaying.put(channelId, true);
    }

    public void endGame(int channelId) {
        channelPlaying.put(channelId, false);
    }

    public boolean isPlaying(int channelId) {
        return channelPlaying.getOrDefault(channelId, false);
    }
}

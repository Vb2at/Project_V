package com.V_Beat.service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class BattleSessionService {

    // channelId -> Map<userId, isEditing> (플레이어)
    private final Map<Integer, Map<Integer, Boolean>> channelUsers = new ConcurrentHashMap<>();

    // channelId -> Set<userId> (관전자)
    private final Map<Integer, Set<Integer>> channelSpectators = new ConcurrentHashMap<>();

    // channelId -> 게임 진행중 여부
    private final Map<Integer, Boolean> channelPlaying = new ConcurrentHashMap<>();

    // =========================
    // 플레이어 관리
    // =========================
    public void addUser(int channelId, int userId) {
        channelUsers
            .computeIfAbsent(channelId, k -> new ConcurrentHashMap<>())
            .put(userId, false);

        // 방이 처음 생기면 기본은 게임 전 상태
        channelPlaying.putIfAbsent(channelId, false);
    }

    public void removeUser(int channelId, int userId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        if (users != null) {
            users.remove(userId);
        }

        // ✅ 정책: 마지막 플레이어가 나가면 방 종료(상태 삭제)
        cleanupChannelIfEmpty(channelId);
    }

    public boolean isPlayer(int channelId, int userId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        return users != null && users.containsKey(userId);
    }

    public void setEditing(int channelId, int userId, boolean isEditing) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        if (users != null && users.containsKey(userId)) {
            users.put(userId, isEditing);
        }
    }

    /**
     * ✅ 읽기 전용으로 반환 (외부에서 put/remove 시도 방지)
     */
    public Map<Integer, Boolean> getChannelUsers(int channelId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        return (users == null) ? Collections.emptyMap() : Collections.unmodifiableMap(users);
    }

    // =========================
    // 관전자 관리
    // =========================
    public void spectatorJoin(int channelId, int userId) {
        channelSpectators
            .computeIfAbsent(channelId, k -> ConcurrentHashMap.newKeySet())
            .add(userId);
    }

    public void spectatorLeave(int channelId, int userId) {
        Set<Integer> set = channelSpectators.get(channelId);
        if (set != null) {
            set.remove(userId);
            if (set.isEmpty()) {
                channelSpectators.remove(channelId);
            }
        }
    }

    public boolean isSpectator(int channelId, int userId) {
        Set<Integer> set = channelSpectators.get(channelId);
        return set != null && set.contains(userId);
    }

    /**
     * ✅ 연결 끊김 대비: 모든 채널에서 관전자 제거
     */
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

    /**
     * ✅ 추가: DISCONNECT 시 플레이어도 전 채널에서 제거
     * - 결과화면에서 /battle/leave 못 보내는 경우 방치 방지
     * - ✅ 정책: 마지막 플레이어 0명이면 방 종료(상태 삭제)
     */
    public void playerLeaveAll(int userId) {
        for (Iterator<Map.Entry<Integer, Map<Integer, Boolean>>> it = channelUsers.entrySet().iterator(); it.hasNext();) {
            Map.Entry<Integer, Map<Integer, Boolean>> entry = it.next();
            int channelId = entry.getKey();
            Map<Integer, Boolean> users = entry.getValue();

            users.remove(userId);

            // ✅ 마지막 플레이어가 사라지면 방 종료
            if (users.isEmpty()) {
                it.remove(); // channelUsers에서 제거
                channelPlaying.remove(channelId);
                channelSpectators.remove(channelId);
            }
        }
    }

    // =========================
    // 게임 상태
    // =========================
    public void startGame(int channelId) {
        channelPlaying.put(channelId, true);
    }

    public boolean isPlaying(int channelId) {
        return channelPlaying.getOrDefault(channelId, false);
    }

    // =========================
    // 내부: 채널 정리 정책
    // ✅ 정책 고정:
    // - 플레이어가 0명이 되는 순간 "방 종료"
    // - 방 종료 = channelUsers/channelPlaying/channelSpectators 모두 삭제
    // =========================
    private void cleanupChannelIfEmpty(int channelId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);

        if (users == null || users.isEmpty()) {
            channelUsers.remove(channelId);
            channelPlaying.remove(channelId);
            channelSpectators.remove(channelId);
        }
    }
}

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

    // channelId -> Map<userId, isReady> (플레이어 READY 상태)
    private final Map<Integer, Map<Integer, Boolean>> channelReady = new ConcurrentHashMap<>();

    // =========================
    // ✅ B안 핵심: 채널별 락
    // =========================
    /**
     * ✅ channelId 별로 동기화 락을 둬서
     * "체크(size) → 추가(put)" 같은 동작을 원자적으로 만든다.
     *
     * - 예: 동시에 2명이 join하면 둘 다 size==1로 보고 들어와버리는 레이스 방지
     * - ConcurrentHashMap만으로는 "size 체크 + put"이 원자적이지 않음
     */
    private final Map<Integer, Object> channelLocks = new ConcurrentHashMap<>();

    private Object lockFor(int channelId) {
        return channelLocks.computeIfAbsent(channelId, k -> new Object());
    }

    // =========================
    // 플레이어 관리
    // =========================

    /**
     * ✅ 플레이어 추가 (1:1 강제 + 동시성 안전)
     *
     * - 중복 참가 방지: 이미 있으면 false
     * - (정책) 플레이어 최대 2명 제한
     * - (정책) 플레이어가 되면 관전자 목록에서 제거
     * - READY 기본값 false
     * - channelPlaying 기본값 false
     */
    public boolean addUser(int channelId, int userId) {

        // ✅ 채널 단위 락으로 size 체크 + put을 원자적으로 처리
        synchronized (lockFor(channelId)) {

            Map<Integer, Boolean> users =
                    channelUsers.computeIfAbsent(channelId, k -> new ConcurrentHashMap<>());

            // 이미 플레이어면 중복 참가 방지
            if (users.containsKey(userId)) return false;

            // 1:1 정책 강제
            if (users.size() >= 2) return false;

            // 신규 플레이어 등록
            users.put(userId, false);

            // 게임 상태 기본값
            channelPlaying.putIfAbsent(channelId, false);

            // READY 기본값 false
            channelReady
                    .computeIfAbsent(channelId, k -> new ConcurrentHashMap<>())
                    .putIfAbsent(userId, false);

            // 플레이어로 들어오면 관전자에서 제거 (겹침 방지)
            Set<Integer> specs = channelSpectators.get(channelId);
            if (specs != null) {
                specs.remove(userId);
                if (specs.isEmpty()) {
                    channelSpectators.remove(channelId);
                }
            }

            return true;
        }
    }

    /**
     * ✅ 플레이어 제거
     *
     * - 중복 leave 방지
     * - READY 상태도 함께 제거
     * - 마지막 플레이어면 방 정리
     */
    public boolean removeUser(int channelId, int userId) {

        synchronized (lockFor(channelId)) {

            Map<Integer, Boolean> users = channelUsers.get(channelId);
            if (users == null) return false;

            Boolean removed = users.remove(userId);
            if (removed == null) return false;

            // READY에서도 제거
            Map<Integer, Boolean> readyMap = channelReady.get(channelId);
            if (readyMap != null) {
                readyMap.remove(userId);
                if (readyMap.isEmpty()) channelReady.remove(channelId);
            }

            cleanupChannelIfEmpty(channelId);
            return true;
        }
    }

    public boolean isPlayer(int channelId, int userId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        return users != null && users.containsKey(userId);
    }

    /**
     * ✅ 읽기 전용 반환
     * - 외부에서 put/remove 방지
     */
    public Map<Integer, Boolean> getChannelUsers(int channelId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        return (users == null) ? Collections.emptyMap() : Collections.unmodifiableMap(users);
    }

    // =========================
    // READY 관리
    // =========================

    /**
     * ✅ 플레이어 READY 설정
     * - 플레이어가 아니면 false
     */
    public boolean setReady(int channelId, int userId, boolean ready) {
        if (!isPlayer(channelId, userId)) return false;

        channelReady
                .computeIfAbsent(channelId, k -> new ConcurrentHashMap<>())
                .put(userId, ready);
        return true;
    }

    /**
     * ✅ 플레이어 2명 + 둘 다 READY
     */
    public boolean areBothPlayersReady(int channelId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);
        if (users == null || users.size() != 2) return false;

        Map<Integer, Boolean> rm = channelReady.get(channelId);
        if (rm == null) return false;

        for (Integer uid : users.keySet()) {
            if (!Boolean.TRUE.equals(rm.get(uid))) return false;
        }
        return true;
    }

    // =========================
    // 관전자 관리
    // =========================

    /**
     * ✅ 관전자 입장
     * - 플레이어면 거부
     * - 중복 join 방지
     */
    public boolean spectatorJoin(int channelId, int userId) {
        if (isPlayer(channelId, userId)) return false;

        return channelSpectators
                .computeIfAbsent(channelId, k -> ConcurrentHashMap.newKeySet())
                .add(userId);
    }

    /**
     * ✅ 관전자 퇴장
     */
    public boolean spectatorLeave(int channelId, int userId) {
        Set<Integer> set = channelSpectators.get(channelId);
        if (set == null) return false;

        boolean removed = set.remove(userId);
        if (removed && set.isEmpty()) {
            channelSpectators.remove(channelId);
        }
        return removed;
    }

    public boolean isSpectator(int channelId, int userId) {
        Set<Integer> set = channelSpectators.get(channelId);
        return set != null && set.contains(userId);
    }

    /**
     * ✅ 연결 끊김 대비: 모든 채널에서 관전자 제거
     *
     * ⚠ iterator.remove 사용 금지 (ConcurrentHashMap)
     * → 제거 대상 channelId를 모아서 후처리
     */
    public void spectatorLeaveAll(int userId) {
        List<Integer> emptyChannels = new ArrayList<>();

        for (Map.Entry<Integer, Set<Integer>> entry : channelSpectators.entrySet()) {
            Set<Integer> set = entry.getValue();
            set.remove(userId);

            if (set.isEmpty()) {
                emptyChannels.add(entry.getKey());
            }
        }

        for (Integer channelId : emptyChannels) {
            channelSpectators.remove(channelId);
        }
    }

    /**
     * ✅ DISCONNECT 시 플레이어도 전 채널에서 제거
     *
     * - join/remove와 교차될 수 있으므로 채널 락 사용
     * - 마지막 플레이어면 방 전체 상태 정리
     */
    public void playerLeaveAll(int userId) {
        List<Integer> emptyChannels = new ArrayList<>();

        for (Map.Entry<Integer, Map<Integer, Boolean>> entry : channelUsers.entrySet()) {
            int channelId = entry.getKey();

            synchronized (lockFor(channelId)) {
                Map<Integer, Boolean> users = entry.getValue();

                Boolean removed = users.remove(userId);
                if (removed == null) continue;

                // READY에서도 제거
                Map<Integer, Boolean> readyMap = channelReady.get(channelId);
                if (readyMap != null) {
                    readyMap.remove(userId);
                    if (readyMap.isEmpty()) channelReady.remove(channelId);
                }

                // 마지막 플레이어면 방 종료 예약
                if (users.isEmpty()) {
                    emptyChannels.add(channelId);
                }
            }
        }

        // 실제 상태 제거는 루프 밖에서
        for (Integer channelId : emptyChannels) {
            channelUsers.remove(channelId);
            channelPlaying.remove(channelId);
            channelSpectators.remove(channelId);
            channelReady.remove(channelId);
            channelLocks.remove(channelId);
        }
    }

    // =========================
    // 게임 상태
    // =========================

    /**
     * ✅ READY 조건 만족 시 1회만 게임 시작
     */
    public boolean startGameIfReady(int channelId) {
        if (isPlaying(channelId)) return false;
        if (!areBothPlayersReady(channelId)) return false;

        channelPlaying.put(channelId, true);
        return true;
    }

    public boolean isPlaying(int channelId) {
        return channelPlaying.getOrDefault(channelId, false);
    }

    /**
     * ✅ 게임 종료 (재경기 대비)
     */
    public void endGame(int channelId) {
        channelPlaying.put(channelId, false);

        Map<Integer, Boolean> rm = channelReady.get(channelId);
        if (rm != null) {
            for (Integer uid : rm.keySet()) {
                rm.put(uid, false);
            }
        }
    }

    // =========================
    // 내부: 채널 정리 정책
    // =========================
    /**
     * ✅ 플레이어가 0명이 되는 순간 방 종료
     */
    private void cleanupChannelIfEmpty(int channelId) {
        Map<Integer, Boolean> users = channelUsers.get(channelId);

        if (users == null || users.isEmpty()) {
            channelUsers.remove(channelId);
            channelPlaying.remove(channelId);
            channelSpectators.remove(channelId);
            channelReady.remove(channelId);
            channelLocks.remove(channelId);
        }
    }
}

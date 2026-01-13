package com.V_Beat.controller;

// ✅ FLOOD 방어용 추가 import
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import jakarta.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.V_Beat.dto.Member;
import com.V_Beat.dto.Message;
import com.V_Beat.service.BattleSessionService;
import com.V_Beat.service.MemberService;
import com.V_Beat.service.MessageService;

@Controller
public class MessageController {

    private static final Logger log = LoggerFactory.getLogger(MessageController.class);

    private final MessageService messageService;
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final BattleSessionService battleSessionService;
    private final MemberService memberService;

    public MessageController(BattleSessionService battleSessionService,
                             MessageService messageService,
                             SimpMessagingTemplate simpMessagingTemplate,
                             MemberService memberService) {
        this.messageService = messageService;
        this.simpMessagingTemplate = simpMessagingTemplate;
        this.battleSessionService = battleSessionService;
        this.memberService = memberService;
    }

    // =========================
    // ✅ Matgim 설정 (application.yml 주입)
    // =========================

    @Value("${matgim.base-url:https://api.matgim.ai/54edkvw2hn}")
    private String matgimBaseUrl;

    @Value("${matgim.path:/api-keyword-slang}")
    private String matgimPath;

    @Value("${matgim.timeout-ms:800}")
    private int matgimTimeoutMs;

    @Value("${matgim.doc-max:1000}")
    private int matgimDocMax;

    @Value("${matgim.log-cooldown-ms:10000}")
    private long matgimLogCooldownMs;

    // 1순위-1) 연속 실패 쿨다운
    @Value("${matgim.fail-threshold:3}")
    private int matgimFailThreshold;

    @Value("${matgim.disable-ms:30000}")
    private long matgimDisableMs;

    // 1순위-2) 동일 메시지 캐시
    @Value("${matgim.cache-ttl-ms:3000}")
    private long matgimCacheTtlMs;

    @Value("${matgim.cache-max-size:5000}")
    private int matgimCacheMaxSize;

    @Value("${matgim.cache-cleanup-interval-ms:10000}")
    private long matgimCacheCleanupIntervalMs;

    // =========================
    // ✅ Matgim 런타임 상태값
    // =========================

    private volatile long lastMatgimLogAtMs = 0L;

    private final AtomicInteger matgimFailCount = new AtomicInteger(0);
    private final AtomicLong matgimDisabledUntilMs = new AtomicLong(0L);

    private static class SlangCacheEntry {
        final String masked;
        final long savedAtMs;
        SlangCacheEntry(String masked, long savedAtMs) {
            this.masked = masked;
            this.savedAtMs = savedAtMs;
        }
    }

    private final Map<String, SlangCacheEntry> matgimCache = new ConcurrentHashMap<>();
    private final AtomicLong lastMatgimCacheCleanupAtMs = new AtomicLong(0L);

    // ✅ 2순위: 필터 결과 메타데이터 전달용
    private static class FilterResult {
        final String content;
        final boolean filtered;
        final String filterType;

        FilterResult(String content, boolean filtered, String filterType) {
            this.content = content;
            this.filtered = filtered;
            this.filterType = filterType;
        }
    }

    // =========================
    // ✅ RestTemplate (타임아웃: 설정값 기반)
    // =========================
    private RestTemplate restTemplate;

    @PostConstruct
    private void initRestTemplate() {
        this.restTemplate = createRestTemplateWithTimeout(matgimTimeoutMs);
        log.info("Matgim RestTemplate initialized. timeoutMs={}", matgimTimeoutMs);
    }

    private static RestTemplate createRestTemplateWithTimeout(int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        return new RestTemplate(factory);
    }

    /**
     * ✅ 환경변수에서 API KEY 읽기
     */
    private static String getMatgimApiKey() {
        String key = System.getenv("MATGIM_API_KEY");
        return (key == null) ? "" : key.trim();
    }

    /**
     * ✅ 한글(완성형/자모) 포함 여부 체크
     */
    private boolean containsHangulOrJamo(String s) {
        if (s == null || s.isEmpty()) return false;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if ((ch >= 0xAC00 && ch <= 0xD7A3) || (ch >= 0x3130 && ch <= 0x318F)) {
                return true;
            }
        }
        return false;
    }

    /**
     * ✅ Matgim 결과로 채팅을 "차단"하지 않고 "마스킹" 처리
     * - filtered 메타데이터를 함께 반환
     */
    @SuppressWarnings("unchecked")
    private FilterResult maskSlangByMatgim(String original) {
        if (original == null) return new FilterResult(null, false, null);

        long now = System.currentTimeMillis();

        // ✅ (1순위-1) API 쿨다운 중이면 즉시 스킵
        if (matgimDisabledUntilMs.get() > now) {
            return new FilterResult(original, false, null);
        }

        String trimmed = original;
        if (trimmed.isBlank()) return new FilterResult(original, false, null);

        // ✅ 키 없으면 호출 자체 금지
        String apiKey = getMatgimApiKey();
        if (apiKey.isBlank()) return new FilterResult(original, false, null);

        // ✅ 의미 없는 호출 스킵
        if (trimmed.length() < 2) return new FilterResult(original, false, null);
        if (!containsHangulOrJamo(trimmed)) return new FilterResult(original, false, null);

        // ✅ document 제한
        String doc = trimmed;
        if (doc.length() > matgimDocMax) {
            doc = doc.substring(0, matgimDocMax);
        }

        // ✅ (1순위-2) 캐시 hit면 API 호출 스킵
        SlangCacheEntry cached = matgimCache.get(doc);
        if (cached != null && (now - cached.savedAtMs) <= matgimCacheTtlMs) {
            boolean filtered = !Objects.equals(original, cached.masked);
            return new FilterResult(cached.masked, filtered, filtered ? "MATGIM" : null);
        }

        try {
            Map<String, Object> body = Map.of("document", doc);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-auth-token", apiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    matgimBaseUrl + matgimPath,
                    request,
                    Map.class
            );

            // ✅ 통신/응답 성공 → 실패 카운트 리셋
            matgimFailCount.set(0);

            Map<String, Object> res = response.getBody();
            Object data = (res != null) ? res.get("data") : null;

            // ✅ 탐지 없음도 캐시
            if (!(data instanceof java.util.List<?> list) || list.isEmpty()) {
                matgimCache.put(doc, new SlangCacheEntry(original, now));
                cleanupMatgimCacheIfNeeded(now);
                return new FilterResult(original, false, null);
            }

            java.util.List<int[]> ranges = new java.util.ArrayList<>();
            for (Object o : list) {
                if (!(o instanceof Map<?, ?> item)) continue;

                Object so = item.get("start_offset");
                Object eo = item.get("end_offset");
                if (!(so instanceof Number) || !(eo instanceof Number)) continue;

                int start = ((Number) so).intValue();
                int endInc = ((Number) eo).intValue(); // inclusive

                if (start < 0) start = 0;
                if (endInc < start) continue;

                int maxIdx = doc.length() - 1;
                if (maxIdx < 0) break;

                if (start > maxIdx) continue;
                if (endInc > maxIdx) endInc = maxIdx;

                ranges.add(new int[]{start, endInc});
            }

            if (ranges.isEmpty()) {
                matgimCache.put(doc, new SlangCacheEntry(original, now));
                cleanupMatgimCacheIfNeeded(now);
                return new FilterResult(original, false, null);
            }

            // 병합
            ranges.sort(java.util.Comparator.comparingInt(a -> a[0]));
            java.util.List<int[]> merged = new java.util.ArrayList<>();
            int[] cur = ranges.get(0);
            for (int i = 1; i < ranges.size(); i++) {
                int[] nxt = ranges.get(i);
                if (nxt[0] <= cur[1] + 1) cur[1] = Math.max(cur[1], nxt[1]);
                else {
                    merged.add(cur);
                    cur = nxt;
                }
            }
            merged.add(cur);

            StringBuilder sb = new StringBuilder(original);
            int maxMaskableLen = Math.min(doc.length(), sb.length());
            int maxMaskIdx = maxMaskableLen - 1;
            if (maxMaskIdx < 0) {
                return new FilterResult(original, false, null);
            }

            for (int i = merged.size() - 1; i >= 0; i--) {
                int start = merged.get(i)[0];
                int endInc = merged.get(i)[1];

                if (start > maxMaskIdx) continue;
                if (endInc > maxMaskIdx) endInc = maxMaskIdx;

                int len = endInc - start + 1;
                if (len <= 0) continue;

                sb.replace(start, endInc + 1, "*".repeat(len));
            }

            String masked = sb.toString();

            // 캐시 저장
            matgimCache.put(doc, new SlangCacheEntry(masked, now));
            cleanupMatgimCacheIfNeeded(now);

            boolean filtered = !Objects.equals(original, masked);
            return new FilterResult(masked, filtered, filtered ? "MATGIM" : null);

        } catch (RestClientException e) {
            long t = System.currentTimeMillis();

            int fails = matgimFailCount.incrementAndGet();
            if (fails >= matgimFailThreshold) {
                matgimDisabledUntilMs.set(t + matgimDisableMs);
                matgimFailCount.set(0);
            }

            if (t - lastMatgimLogAtMs >= matgimLogCooldownMs) {
                lastMatgimLogAtMs = t;
                log.warn("Matgim slang API failed/timeout. Passing original. disabledUntil={} reason={}",
                        matgimDisabledUntilMs.get(), e.toString());
            }
            return new FilterResult(original, false, null);

        } catch (Exception e) {
            long t = System.currentTimeMillis();

            int fails = matgimFailCount.incrementAndGet();
            if (fails >= matgimFailThreshold) {
                matgimDisabledUntilMs.set(t + matgimDisableMs);
                matgimFailCount.set(0);
            }

            if (t - lastMatgimLogAtMs >= matgimLogCooldownMs) {
                lastMatgimLogAtMs = t;
                log.warn("Matgim slang API unexpected error. Passing original. disabledUntil={} reason={}",
                        matgimDisabledUntilMs.get(), e.toString());
            }
            return new FilterResult(original, false, null);
        }
    }

    private void cleanupMatgimCacheIfNeeded(long now) {
        long last = lastMatgimCacheCleanupAtMs.get();
        if ((now - last) < matgimCacheCleanupIntervalMs) return;
        if (!lastMatgimCacheCleanupAtMs.compareAndSet(last, now)) return;

        if (matgimCache.size() > matgimCacheMaxSize) {
            int removed = 0;
            for (String k : matgimCache.keySet()) {
                matgimCache.remove(k);
                if (++removed >= 1000) break;
            }
            return;
        }

        for (Map.Entry<String, SlangCacheEntry> e : matgimCache.entrySet()) {
            if ((now - e.getValue().savedAtMs) > matgimCacheTtlMs) {
                matgimCache.remove(e.getKey());
            }
        }
    }

    // =========================
    // ✅ FLOOD 최소 방어 (Rate Limit)
    // =========================

    private final Map<Integer, Deque<Long>> chatRateWindow = new ConcurrentHashMap<>();
    private final Map<Integer, Long> chatWarnCooldown = new ConcurrentHashMap<>();

    private static final long CHAT_WINDOW_MS = 1000L;
    private static final int  CHAT_MAX_IN_WINDOW = 5;
    private static final long CHAT_WARN_COOLDOWN_MS = 2000L;
    private static final int  CHAT_MAX_LENGTH = 200;

    private boolean allowChat(int userId) {
        long now = System.currentTimeMillis();
        Deque<Long> q = chatRateWindow.computeIfAbsent(userId, k -> new ArrayDeque<>());

        synchronized (q) {
            while (!q.isEmpty() && (now - q.peekFirst()) > CHAT_WINDOW_MS) q.pollFirst();
            if (q.size() >= CHAT_MAX_IN_WINDOW) return false;
            q.addLast(now);
            return true;
        }
    }

    private boolean shouldWarn(int userId) {
        long now = System.currentTimeMillis();
        Long last = chatWarnCooldown.get(userId);
        if (last != null && (now - last) < CHAT_WARN_COOLDOWN_MS) return false;
        chatWarnCooldown.put(userId, now);
        return true;
    }

    // =========================
    // ✅ 복붙 도배 방어
    // =========================

    private static class RepeatState {
        String lastContent;
        int repeatCount;
        long lastAtMs;

        String muteContent;
        long muteUntilMs;
    }

    private final Map<Integer, RepeatState> chatRepeatState = new ConcurrentHashMap<>();

    private static final int  CHAT_MAX_CONSECUTIVE_SAME = 5;
    private static final long CHAT_REPEAT_WINDOW_MS = 10_000L;
    private static final long CHAT_SAME_MUTE_MS = 20_000L;

    private boolean allowRepeatedPaste(int userId, String contentNormalized) {
        long now = System.currentTimeMillis();
        RepeatState st = chatRepeatState.computeIfAbsent(userId, k -> new RepeatState());

        synchronized (st) {
            if (st.muteContent != null && st.muteUntilMs > now && Objects.equals(st.muteContent, contentNormalized)) {
                return false;
            }

            if (st.muteUntilMs > 0 && st.muteUntilMs <= now) {
                st.muteContent = null;
                st.muteUntilMs = 0;
            }

            if (st.lastAtMs > 0 && (now - st.lastAtMs) > CHAT_REPEAT_WINDOW_MS) {
                st.lastContent = null;
                st.repeatCount = 0;
            }

            if (Objects.equals(st.lastContent, contentNormalized)) {
                st.repeatCount++;
                if (st.repeatCount > CHAT_MAX_CONSECUTIVE_SAME) {
                    st.muteContent = contentNormalized;
                    st.muteUntilMs = now + CHAT_SAME_MUTE_MS;
                    st.lastAtMs = now;
                    return false;
                }
            } else {
                st.lastContent = contentNormalized;
                st.repeatCount = 1;
            }

            st.lastAtMs = now;
            return true;
        }
    }

    // =========================
    // 공통 유틸
    // =========================

    private Integer getUserId(SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> attrs = headerAccessor.getSessionAttributes();
        if (attrs == null) return null;

        Object v = attrs.get("userId");
        if (v == null) return null;

        if (v instanceof Integer) return (Integer) v;
        if (v instanceof Number) return ((Number) v).intValue();

        if (v instanceof String s) {
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private Integer getChannelId(Map<String, Object> payload) {
        if (payload == null) return null;
        Object v = payload.get("channelId");
        if (!(v instanceof Number)) return null;
        return ((Number) v).intValue();
    }

    private void sendUserMessage(int userId, String type, Integer channelId, String content) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", type);
        if (channelId != null) msg.put("channelId", channelId);
        msg.put("content", content);

        simpMessagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/notify",
                msg
        );
    }

    private void sendSystemToChannel(int channelId, String content) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "system");
        msg.put("channelId", channelId);
        msg.put("content", content);

        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, msg);
    }

    private String getNickOrDefault(int userId) {
        Member m = memberService.findById(userId);
        return (m != null && m.getNickName() != null) ? m.getNickName() : ("user#" + userId);
    }

    // =========================
    // 1) 채팅 전송
    // =========================

    @MessageMapping("/chat")
    public void sendMessage(@Payload Message message, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = getUserId(headerAccessor);
        if (userId == null) return;

        if (message == null) {
            sendUserMessage(userId, "error", null, "잘못된 메시지 형식입니다.");
            return;
        }

        int channelId = message.getChannelId();
        String content = message.getContent();

        if (content == null || content.trim().isEmpty()) {
            sendUserMessage(userId, "error", channelId, "빈 메시지는 보낼 수 없습니다.");
            return;
        }

        String trimmed = content.trim();
        if (trimmed.length() > CHAT_MAX_LENGTH) {
            sendUserMessage(userId, "error", channelId, "메시지가 너무 깁니다. (최대 " + CHAT_MAX_LENGTH + "자)");
            return;
        }

        if (!allowRepeatedPaste(userId, trimmed)) {
            if (shouldWarn(userId)) {
                sendUserMessage(
                        userId,
                        "error",
                        channelId,
                        "같은 메시지를 연속으로 너무 많이 보냈습니다. (6번째부터 차단 / 20초간 동일 메시지 금지)"
                );
            }
            return;
        }

        if (!allowChat(userId)) {
            if (shouldWarn(userId)) {
                sendUserMessage(userId, "error", channelId, "채팅을 너무 빠르게 보내고 있습니다. 잠시 후 다시 시도하세요.");
            }
            return;
        }

        boolean isSpectator = battleSessionService.isSpectator(channelId, userId);
        boolean isPlayer = battleSessionService.isPlayer(channelId, userId);
        boolean isPlaying = battleSessionService.isPlaying(channelId);

        if (!isSpectator && !isPlayer) {
            sendUserMessage(userId, "error", channelId, "채널 참가자만 채팅을 보낼 수 있습니다.");
            return;
        }

        if (isPlayer && isPlaying) {
            sendUserMessage(userId, "error", channelId, "게임 중에는 플레이어가 채팅을 보낼 수 없습니다.");
            return;
        }

        Member m = memberService.findById(userId);
        if (m == null) {
            sendUserMessage(userId, "error", channelId, "사용자 정보를 찾을 수 없습니다.");
            return;
        }

        // ✅ 서버에서 userId/닉/프로필 확정(클라 조작 방지)
        message.setUserId(userId);
        message.setNickName(m.getNickName());
        message.setProfileImg(m.getProfileImg());

        // ✅ 욕설/비속어 마스킹 + 메타데이터 세팅
        FilterResult fr = maskSlangByMatgim(trimmed);
        message.setContent(fr.content);
        message.setFiltered(fr.filtered);
        message.setFilterType(fr.filterType);

        int type = message.getType();

        // ✅ DB 저장: 마스킹된 내용만 저장 (신고 대비/해시 없음)
        messageService.createMessage(
                channelId,
                userId,
                message.getContent(),
                type
        );

        // ✅ 브로드캐스트 (메타데이터 포함)
        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, message);
    }

    // =========================
    // 2) 관전자 입장/퇴장
    // =========================

    @MessageMapping("/channel/join")
    public void joinChannel(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = getUserId(headerAccessor);
        if (userId == null) return;

        Integer channelId = getChannelId(payload);
        if (channelId == null) {
            sendUserMessage(userId, "error", null, "channelId가 올바르지 않습니다.");
            return;
        }

        boolean joined = battleSessionService.spectatorJoin(channelId, userId);
        if (!joined) {
            if (battleSessionService.isPlayer(channelId, userId)) {
                sendUserMessage(userId, "error", channelId, "플레이어는 관전자로 입장할 수 없습니다.");
            }
            return;
        }

        sendSystemToChannel(channelId, getNickOrDefault(userId) + "님이 입장했습니다.");
    }

    @MessageMapping("/channel/leave")
    public void leaveChannel(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = getUserId(headerAccessor);
        if (userId == null) return;

        Integer channelId = getChannelId(payload);
        if (channelId == null) {
            sendUserMessage(userId, "error", null, "channelId가 올바르지 않습니다.");
            return;
        }

        boolean left = battleSessionService.spectatorLeave(channelId, userId);
        if (!left) return;

        sendSystemToChannel(channelId, getNickOrDefault(userId) + "님이 퇴장했습니다.");
    }

    // =========================
    // 3) 플레이어 입장 / READY / 게임 시작
    // =========================

    @MessageMapping("/battle/join")
    public void joinBattle(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = getUserId(headerAccessor);
        if (userId == null) return;

        Integer channelId = getChannelId(payload);
        if (channelId == null) {
            sendUserMessage(userId, "error", null, "channelId가 올바르지 않습니다.");
            return;
        }

        boolean joined = battleSessionService.addUser(channelId, userId);

        if (joined) {
            sendSystemToChannel(channelId, getNickOrDefault(userId) + "님이 플레이어로 입장했습니다.");
            return;
        }

        if (battleSessionService.isPlayer(channelId, userId)) {
            return;
        }

        sendUserMessage(userId, "error", channelId, "이미 플레이어가 가득 찼습니다 (최대 2명).");
    }

    @MessageMapping("/battle/ready")
    public void readyBattle(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = getUserId(headerAccessor);
        if (userId == null) return;

        Integer channelId = getChannelId(payload);
        if (channelId == null) {
            sendUserMessage(userId, "error", null, "channelId가 올바르지 않습니다.");
            return;
        }

        if (battleSessionService.isPlaying(channelId)) {
            sendUserMessage(userId, "error", channelId, "게임 중에는 READY를 변경할 수 없습니다.");
            return;
        }

        Object r = payload.get("ready");
        boolean ready = (r instanceof Boolean) ? (Boolean) r : true;

        boolean ok = battleSessionService.setReady(channelId, userId, ready);
        if (!ok) {
            sendUserMessage(userId, "error", channelId, "플레이어만 READY 할 수 있습니다.");
            return;
        }

        Map<String, Object> readyMsg = new HashMap<>();
        readyMsg.put("type", "PLAYER_READY");
        readyMsg.put("channelId", channelId);
        readyMsg.put("userId", userId);
        readyMsg.put("ready", ready);

        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, readyMsg);

        boolean started = battleSessionService.startGameIfReady(channelId);
        if (started) {
            Map<String, Object> start = new HashMap<>();
            start.put("type", "GAME_START");
            start.put("channelId", channelId);
            start.put("content", "게임이 시작됩니다.");
            simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, start);
        }
    }

    // =========================
    // 4) 플레이어 나가기
    // =========================

    @MessageMapping("/battle/leave")
    public void leaveBattle(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = getUserId(headerAccessor);
        if (userId == null) return;

        Integer channelId = getChannelId(payload);
        if (channelId == null) {
            sendUserMessage(userId, "error", null, "channelId가 올바르지 않습니다.");
            return;
        }

        boolean isPlayer = battleSessionService.isPlayer(channelId, userId);
        int playerCountBefore = battleSessionService.getChannelUsers(channelId).size();
        boolean isLastPlayerLeaving = isPlayer && playerCountBefore == 1;

        boolean removed = battleSessionService.removeUser(channelId, userId);
        if (!removed) return;

        sendSystemToChannel(channelId, getNickOrDefault(userId) + "님이 대결방을 나갔습니다.");

        if (isLastPlayerLeaving) {
            Map<String, Object> closed = new HashMap<>();
            closed.put("type", "ROOM_CLOSED");
            closed.put("channelId", channelId);
            closed.put("content", "방이 종료되었습니다.");
            simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, closed);
        }
    }

    public void inviteNoti(int userId) {
        sendUserMessage(userId, "info", null, "new_invite");
    }
}

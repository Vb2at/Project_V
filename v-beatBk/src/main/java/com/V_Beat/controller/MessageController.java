package com.V_Beat.controller;

// ✅ FLOOD 방어용 추가 import
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.V_Beat.dto.FilterResult;
import com.V_Beat.dto.Message;
import com.V_Beat.dto.User;
import com.V_Beat.service.BattleSessionService;
import com.V_Beat.service.MessageService;
import com.V_Beat.service.ProfanityFilterService;   // ✅ 변경
import com.V_Beat.service.UserService;

@Controller
public class MessageController {

    private static final Logger log = LoggerFactory.getLogger(MessageController.class);

    private final MessageService messageService;
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final BattleSessionService battleSessionService;
    private final UserService userService;

    // ✅ Matgim 제거 → LOCAL_DB 필터
    private final ProfanityFilterService profanityFilterService;

    public MessageController(BattleSessionService battleSessionService,
                             MessageService messageService,
                             SimpMessagingTemplate simpMessagingTemplate,
                             UserService userService,
                             ProfanityFilterService profanityFilterService) {
        this.messageService = messageService;
        this.simpMessagingTemplate = simpMessagingTemplate;
        this.battleSessionService = battleSessionService;
        this.userService = userService;
        this.profanityFilterService = profanityFilterService;
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
        User u = userService.findById(userId);
        return (u != null && u.getNickName() != null) ? u.getNickName() : ("user#" + userId);
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

        User u = userService.findById(userId);
        if (u == null) {
            sendUserMessage(userId, "error", channelId, "사용자 정보를 찾을 수 없습니다.");
            return;
        }

        // ✅ 서버에서 userId/닉/프로필 확정
        message.setUserId(userId);
        message.setNickName(u.getNickName());
        message.setProfileImg(u.getProfileImg());

        // ✅ 욕설/비속어 마스킹 + 메타데이터 (LOCAL_DB)
        FilterResult fr = profanityFilterService.mask(trimmed);
        String masked = (fr != null && fr.getContent() != null) ? fr.getContent() : trimmed;
        boolean filtered = (fr != null) && fr.isFiltered();
        String filterType = (fr != null && fr.getFilterType() != null && !fr.getFilterType().isBlank())
                ? fr.getFilterType().trim()
                : (filtered ? "LOCAL_DB" : null);

        message.setContent(masked);
        message.setFiltered(filtered);
        message.setFilterType(filterType);

        int type = message.getType();

        // ✅ DB 저장
        messageService.createChatMessage(
                channelId,
                userId,
                message.getContent(),
                message.isFiltered(),
                message.getFilterType(),
                type
        );

        // ✅ 브로드캐스트
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

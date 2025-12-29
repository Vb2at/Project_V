package com.V_Beat.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.V_Beat.dto.Member;
import com.V_Beat.dto.Message;
import com.V_Beat.service.BattleSessionService;
import com.V_Beat.service.MemberService;
import com.V_Beat.service.MessageService;

@Controller
public class MessageController {

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

    /**
     * ✅ 채팅 전송 규칙 (B안)
     * - 관전자: 읽기 + 쓰기 가능
     * - 플레이어: 게임 중에는 읽기만 가능(전송 금지), 게임 전/후에는 전송 가능
     * - 채널 미참가자: 전송 금지(보안)
     */
    @MessageMapping("/chat")
    public void sendMessage(@Payload Message message, SimpMessageHeaderAccessor headerAccessor) {

        // ✅ userId는 클라 payload 믿지 말고 "세션"에서 가져오기
        Integer userId = (Integer) headerAccessor.getSessionAttributes().get("userId");
        if (userId == null) return;

        int channelId = message.getChannelId();

        // ✅ 역할 판별
        boolean isSpectator = battleSessionService.isSpectator(channelId, userId);
        boolean isPlayer = battleSessionService.isPlayer(channelId, userId);
        boolean isPlaying = battleSessionService.isPlaying(channelId);

        // ✅ 채널 미참가자는 전송 금지
        if (!isSpectator && !isPlayer) {
            sendError(userId, channelId, "채널 참가자만 채팅을 보낼 수 있습니다.");
            return;
        }

        // ✅ 게임 중이면 플레이어는 채팅 전송 금지(읽기만)
        if (isPlayer && isPlaying) {
            sendError(userId, channelId, "게임 중에는 플레이어가 채팅을 보낼 수 없습니다.");
            return;
        }

        // ✅ 서버에서 작성자 정보 채우기 (클라 조작 방지)
        Member m = memberService.findById(userId);
        message.setUserId(userId);
        message.setNickName(m.getNickName());
        message.setProfileImg(m.getProfileImg());

        // ✅ DB 저장
        messageService.createMessage(
                channelId,
                userId,
                message.getContent(),
                message.getType()
        );

        // ✅ 브로드캐스트 (구독: /topic/channel/{channelId})
        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, message);
    }

    /**
     * ✅ 관전자 입장
     * - 관전자 목록(channelSpectators)에만 등록
     * - system 메시지 브로드캐스트
     */
    @MessageMapping("/channel/join")
    public void joinChannel(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = (Integer) headerAccessor.getSessionAttributes().get("userId");
        if (userId == null) return;

        int channelId = (int) payload.get("channelId");

        // ✅ 관전자는 플레이어(addUser)가 아니라 spectatorJoin으로 등록
        battleSessionService.spectatorJoin(channelId, userId);

        Member m = memberService.findById(userId);

        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "system");
        msg.put("content", m.getNickName() + "님이 입장했습니다.");
        msg.put("channelId", channelId);

        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, msg);
    }

    /**
     * ✅ 관전자 퇴장
     * - 관전자 목록에서 제거
     * - system 메시지 브로드캐스트
     */
    @MessageMapping("/channel/leave")
    public void leaveChannel(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = (Integer) headerAccessor.getSessionAttributes().get("userId");
        if (userId == null) return;

        int channelId = (int) payload.get("channelId");

        battleSessionService.spectatorLeave(channelId, userId);

        Member m = memberService.findById(userId);

        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "system");
        msg.put("content", m.getNickName() + "님이 퇴장했습니다.");
        msg.put("channelId", channelId);

        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, msg);
    }

    /**
     * ✅ 플레이어 나가기
     * - 점수 화면에서 "나가기" 누르면 호출
     * - 마지막 플레이어가 나가면 ROOM_CLOSED 브로드캐스트
     */
    @MessageMapping("/battle/leave")
    public void leaveBattle(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = (Integer) headerAccessor.getSessionAttributes().get("userId");
        if (userId == null) return;

        int channelId = (int) payload.get("channelId");

        // ✅ 나가기 전에 "내가 마지막 플레이어인가?" 미리 판단
        boolean isPlayer = battleSessionService.isPlayer(channelId, userId);
        int playerCountBefore = battleSessionService.getChannelUsers(channelId).size();
        boolean isLastPlayerLeaving = isPlayer && playerCountBefore == 1;

        // ✅ 플레이어 제거 (마지막이면 BattleSessionService에서 채널 정리까지 수행)
        battleSessionService.removeUser(channelId, userId);

        // (선택) 나감 알림
        Member m = memberService.findById(userId);
        Map<String, Object> leaveMsg = new HashMap<>();
        leaveMsg.put("type", "system");
        leaveMsg.put("channelId", channelId);
        leaveMsg.put("content", m.getNickName() + "님이 대결방을 나갔습니다.");
        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, leaveMsg);

        // ✅ 마지막 플레이어가 나갔으면 "방 종료" 브로드캐스트
        if (isLastPlayerLeaving) {
            Map<String, Object> closed = new HashMap<>();
            closed.put("type", "ROOM_CLOSED");
            closed.put("channelId", channelId);
            closed.put("content", "방이 종료되었습니다.");
            simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, closed);
        }
    }

    // ✅ 에러 전송 헬퍼 (개인 채널로)
    private void sendError(int userId, int channelId, String content) {
        Map<String, Object> err = new HashMap<>();
        err.put("type", "error");
        err.put("channelId", channelId);
        err.put("content", content);
        simpMessagingTemplate.convertAndSend("/topic/user." + userId, err);
    }

    /**
     * ⚠️ 초대 알림 (프로젝트에서 /topic/user.{id} 패턴이면 유지)
     */
    public void InviteNoti(int userId) {
        simpMessagingTemplate.convertAndSend("/topic/user." + userId, "new_invite");
    }
}

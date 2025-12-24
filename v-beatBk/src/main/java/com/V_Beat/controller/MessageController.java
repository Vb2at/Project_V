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

    // ✅ 생성자 주입이면 final 권장(수정 불가 + 안정성)
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

        // ✅ userId는 클라 payload를 믿지 말고 "세션"에서 가져오기
        Integer userId = (Integer) headerAccessor.getSessionAttributes().get("userId");
        if (userId == null) return;

        int channelId = message.getChannelId();

        // ✅ 역할 판별
        boolean isSpectator = battleSessionService.isSpectator(channelId, userId);
        boolean isPlayer = battleSessionService.getChannelUsers(channelId).containsKey(userId);
        boolean isPlaying = battleSessionService.isPlaying(channelId); // BattleSessionService에 추가한 상태값

        // ✅ 채널 미참가자는 전송 금지
        if (!isSpectator && !isPlayer) {
            Map<String, Object> err = new HashMap<>();
            err.put("type", "error");
            err.put("channelId", channelId);
            err.put("content", "채널 참가자만 채팅을 보낼 수 있습니다.");
            simpMessagingTemplate.convertAndSend("/topic/user." + userId, err);
            return;
        }

        // ✅ 게임 중이면 플레이어는 채팅 전송 금지(읽기만)
        if (isPlayer && isPlaying) {
            Map<String, Object> err = new HashMap<>();
            err.put("type", "error");
            err.put("channelId", channelId);
            err.put("content", "게임 중에는 플레이어가 채팅을 보낼 수 없습니다.");
            simpMessagingTemplate.convertAndSend("/topic/user." + userId, err);
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
     * ✅ 플레이어 "나가기" 버튼 처리 (점수 결과 화면 이후)
     * - 플레이어를 channelUsers에서 제거
     * - 마지막 플레이어가 나가면 게임 종료(endGame)
     * - system 메시지 브로드캐스트(선택)
     *
     * 프론트 전송:
     * destination: /app/battle/leave
     * body: { "channelId": 12 }
     */
    @MessageMapping("/battle/leave")
    public void leaveBattle(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {

        Integer userId = (Integer) headerAccessor.getSessionAttributes().get("userId");
        if (userId == null) return;

        int channelId = (int) payload.get("channelId");

        // ✅ 플레이어 제거
        battleSessionService.removeUser(channelId, userId);

        // ✅ 남은 플레이어가 0명이면 게임 종료 처리
        // (removeUser에서 채널이 정리돼도 getChannelUsers는 빈 Map으로 반환됨)
        if (battleSessionService.getChannelUsers(channelId).isEmpty()) {
            battleSessionService.endGame(channelId);
        }

        // (선택) 나감 알림
        Member m = memberService.findById(userId);
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "system");
        msg.put("channelId", channelId);
        msg.put("content", m.getNickName() + "님이 대결방을 나갔습니다.");
        simpMessagingTemplate.convertAndSend("/topic/channel/" + channelId, msg);
    }

    /**
     * ⚠️ 초대 알림
     * - 프로젝트에서 /topic/user.{id} 를 쓰는 패턴이면 통일 추천
     */
    public void InviteNoti(int userId) {
        simpMessagingTemplate.convertAndSend("/topic/user." + userId, "new_invite");
    }
}

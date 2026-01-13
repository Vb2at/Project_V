package com.V_Beat.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.V_Beat.dao.DuelDao;
import com.V_Beat.dao.FriendDao;
import com.V_Beat.dto.UserLiteDto;
import com.V_Beat.dto.DuelInviteDto;

@Service
public class DuelService {

    private final DuelDao duelDao;
    private final FriendDao friendDao; // 닉네임 조회용(가볍게 재사용)
    private final SimpMessagingTemplate messagingTemplate;
    private final BattleSessionService battleSessionService; // 너가 쓰던 그 서비스(있다고 가정)

    public DuelService(DuelDao duelDao,
                       FriendDao friendDao,
                       SimpMessagingTemplate messagingTemplate,
                       BattleSessionService battleSessionService) {
        this.duelDao = duelDao;
        this.friendDao = friendDao;
        this.messagingTemplate = messagingTemplate;
        this.battleSessionService = battleSessionService;
    }

    private void sendToUser(int toUserId, Map<String, Object> payload) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(toUserId),
                "/queue/notify",
                payload
        );
    }

    public String inviteDuel(int myId, int targetId, String message) {
        if (myId == 0) return "needLogin";
        if (targetId == 0) return "badTarget";
        if (myId == targetId) return "self";

        if (duelDao.countPending(myId, targetId) > 0) return "alreadyInvited";

        DuelInviteDto dto = new DuelInviteDto();
        dto.setFromUserId(myId);
        dto.setToUserId(targetId);
        dto.setMessage(message);

        duelDao.insertInvite(dto); // dto.id 채워짐

        UserLiteDto me = friendDao.findUserLiteById(myId);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "DUEL_INVITE");
        payload.put("inviteId", dto.getId());
        payload.put("fromUserId", myId);
        payload.put("fromNickName", me != null ? me.getNickName() : ("user#" + myId));
        payload.put("message", message);

        sendToUser(targetId, payload);
        return "success";
    }

    public String acceptDuelInvite(int myId, int inviteId) {
        if (myId == 0) return "needLogin";

        Integer inviterId = duelDao.findInviterId(myId, inviteId);
        if (inviterId == null) return "fail";

        int ok = duelDao.accept(myId, inviteId);
        if (ok != 1) return "fail";

        int channelId = inviteId;

        // 플레이어 등록(너 정책 그대로)
        boolean addedInviter = battleSessionService.addUser(channelId, inviterId);
        boolean addedMe = battleSessionService.addUser(channelId, myId);

        if (!addedInviter || !addedMe) return "alreadyInBattle";

        UserLiteDto me = friendDao.findUserLiteById(myId);

        // 초대한 사람에게
        Map<String, Object> payloadA = new HashMap<>();
        payloadA.put("type", "DUEL_ACCEPT");
        payloadA.put("inviteId", inviteId);
        payloadA.put("channelId", channelId);
        payloadA.put("fromUserId", myId);
        payloadA.put("fromNickName", me != null ? me.getNickName() : ("user#" + myId));
        sendToUser(inviterId, payloadA);

        // 수락한 본인에게
        Map<String, Object> payloadMe = new HashMap<>();
        payloadMe.put("type", "DUEL_START");
        payloadMe.put("inviteId", inviteId);
        payloadMe.put("channelId", channelId);
        sendToUser(myId, payloadMe);

        return "success";
    }

    public String rejectDuelInvite(int myId, int inviteId) {
        if (myId == 0) return "needLogin";

        Integer inviterId = duelDao.findInviterId(myId, inviteId);
        if (inviterId == null) return "fail";

        int ok = duelDao.reject(myId, inviteId);
        if (ok != 1) return "fail";

        UserLiteDto me = friendDao.findUserLiteById(myId);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "DUEL_REJECT");
        payload.put("inviteId", inviteId);
        payload.put("fromUserId", myId);
        payload.put("fromNickName", me != null ? me.getNickName() : ("user#" + myId));
        sendToUser(inviterId, payload);

        return "success";
    }
}

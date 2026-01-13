package com.V_Beat.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.V_Beat.dao.FriendDao;
import com.V_Beat.dto.UserLiteDto;
import com.V_Beat.dto.FriendDto;
import com.V_Beat.dto.FriendRequestDto;

@Service
public class FriendService {

    private final FriendDao friendDao;
    private final SimpMessagingTemplate messagingTemplate;
    private final OnlineUserService onlineUserService; // 너 프로젝트에 이미 있던 그거

    public FriendService(FriendDao friendDao,
                         SimpMessagingTemplate messagingTemplate,
                         OnlineUserService onlineUserService) {
        this.friendDao = friendDao;
        this.messagingTemplate = messagingTemplate;
        this.onlineUserService = onlineUserService;
    }

    // ✅ 개인 알림 전송 (/user/queue/notify)
    private void sendToUser(int toUserId, Map<String, Object> payload) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(toUserId),
                "/queue/notify",
                payload
        );
    }

    public String sendFriendRequest(int myId, String keyword) {
        if (myId == 0) return "needLogin";
        if (keyword == null || keyword.trim().isEmpty()) return "emp";

        UserLiteDto target = friendDao.searchUser(keyword.trim());
        if (target == null) return "notFound";
        if (target.getId() == myId) return "self";

        FriendRequestDto rel = friendDao.findFriendRelation(myId, target.getId());
        if (rel != null) {
            if (rel.getStatus() == 1) return "alreadyFriend";
            if (rel.getFromUserId() == myId) return "alreadyRequested";
            return "incomingExists";
        }

        friendDao.insertFriendRequest(myId, target.getId());

        // 알림
        UserLiteDto me = friendDao.findUserLiteById(myId);
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "FRIEND_REQUEST");
        payload.put("fromUserId", myId);
        payload.put("fromNickName", me != null ? me.getNickName() : ("user#" + myId));
        sendToUser(target.getId(), payload);

        return "success";
    }

    public List<FriendDto> getFriendList(int myId) {
        List<FriendDto> friends = friendDao.findFriends(myId);

        // 온라인 상태 주입
        for (FriendDto f : friends) {
            boolean isOnline = onlineUserService.getOnlineUsers().contains(f.getOtherUserId());
            f.setOnline(isOnline);
        }
        return friends;
    }

    public List<FriendRequestDto> getReceivedFriendRequests(int myId) {
        return friendDao.findReceivedFriendRequests(myId);
    }

    public List<FriendRequestDto> getSentFriendRequests(int myId) {
        return friendDao.findSentFriendRequests(myId);
    }

    public String acceptFriendRequest(int myId, int requestId) {
        Integer requesterId = friendDao.findRequesterId(myId, requestId);
        if (requesterId == null) return "fail";

        int ok = friendDao.acceptFriendRequest(myId, requestId);
        if (ok != 1) return "fail";

        UserLiteDto me = friendDao.findUserLiteById(myId);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "FRIEND_ACCEPT");
        payload.put("fromUserId", myId);
        payload.put("fromNickName", me != null ? me.getNickName() : ("user#" + myId));
        sendToUser(requesterId, payload);

        return "success";
    }

    public String rejectFriendRequest(int myId, int requestId) {
        return friendDao.rejectFriendRequest(myId, requestId) == 1 ? "success" : "fail";
    }

    public String cancelFriendRequest(int myId, int requestId) {
        return friendDao.cancelFriendRequest(myId, requestId) == 1 ? "success" : "fail";
    }

    public String deleteFriend(int myId, int targetId) {
        return friendDao.deleteFriend(myId, targetId) == 1 ? "success" : "fail";
    }
}

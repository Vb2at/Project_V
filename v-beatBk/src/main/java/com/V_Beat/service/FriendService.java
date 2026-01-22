package com.V_Beat.service;

import java.util.List;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.V_Beat.dao.FriendDao;
import com.V_Beat.dto.FriendDto;
import com.V_Beat.dto.FriendEvent;
import com.V_Beat.dto.FriendRequestDto;
import com.V_Beat.dto.UserLiteDto;

@Service
public class FriendService {

    private final FriendDao friendDao;
    private final SimpMessagingTemplate messagingTemplate;
    private final OnlineUserService onlineUserService;

    public FriendService(FriendDao friendDao,
                         SimpMessagingTemplate messagingTemplate,
                         OnlineUserService onlineUserService) {
        this.friendDao = friendDao;
        this.messagingTemplate = messagingTemplate;
        this.onlineUserService = onlineUserService;
    }

    // =========================
    // ✅ WS 개인 알림 전송 (/user/queue/friend)
    // - Friends.jsx 같은 "친구 화면" 실시간 갱신용
    // =========================
    private void sendToUser(int toUserId, FriendEvent event) {

        // ✅ 서버 로그로 "진짜 쐈는지" 확인 (디버깅용)
        System.out.println("[WS FRIEND SEND] to=" + toUserId
                + " dest=/user/" + toUserId + "/queue/friend"
                + " type=" + event.getType()
                + " data=" + event.getData());

        messagingTemplate.convertAndSendToUser(
                String.valueOf(toUserId),
                "/queue/friend",
                event
        );
    }

    // =========================
    // ✅ WS 통합 알림 전송 (/user/queue/notify)
    // - MyPage.jsx가 구독중인 "통합 알림" 채널
    // - 어제 방식 그대로: type/event/data 형태로 쏨
    // =========================
    private void sendNotify(int toUserId, String event, Map<String, Object> data) {

        Map<String, Object> payload = Map.of(
                "type", "FRIEND_NOTIFY",
                "event", event,
                "data", data
        );

        System.out.println("[WS NOTIFY SEND] to=" + toUserId
                + " dest=/user/" + toUserId + "/queue/notify"
                + " type=FRIEND_NOTIFY"
                + " event=" + event
                + " data=" + data);

        messagingTemplate.convertAndSendToUser(
                String.valueOf(toUserId),
                "/queue/notify",
                payload
        );
    }

    // =========================
    // ✅ 친구 요청
    // =========================
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

        UserLiteDto me = friendDao.findUserLiteById(myId);
        String fromNick = (me != null ? me.getNickName() : ("user#" + myId));

        // ✅ 1) Friends 페이지 실시간 갱신용 (기존 유지)
        sendToUser(
                target.getId(),
                FriendEvent.of(
                        "FRIEND_REQUEST_RECEIVED",
                        Map.of(
                                "fromUserId", myId,
                                "fromNick", fromNick
                        )
                )
        );

        // ✅ 2) MyPage 통합 알림용 (추가) -> 친구 메뉴 옆 "!" 뜨게 하는 핵심
        // MyPage.jsx 분기:
        // if (payload.type==='FRIEND_NOTIFY' && payload.event==='REQUEST_NEW') pendingFriends++
        sendNotify(
                target.getId(),
                "REQUEST_NEW",
                Map.of(
                        "fromUserId", myId,
                        "fromNick", fromNick
                )
        );

        return "success";
    }

    // =========================
    // ✅ 친구 목록 + 온라인 상태
    // =========================
    public List<FriendDto> getFriendList(int myId) {
        List<FriendDto> friends = friendDao.findFriends(myId);

        for (FriendDto f : friends) {
            boolean isOnline = onlineUserService.getOnlineUsers().contains(f.getOtherUserId());
            f.setOnline(isOnline);
        }
        return friends;
    }

    // =========================
    // ✅ 받은/보낸 요청 목록
    // =========================
    public List<FriendRequestDto> getReceivedFriendRequests(int myId) {
        return friendDao.findReceivedFriendRequests(myId);
    }

    public List<FriendRequestDto> getSentFriendRequests(int myId) {
        return friendDao.findSentFriendRequests(myId);
    }

    // =========================
    // ✅ 친구 요청 수락
    // =========================
    public String acceptFriendRequest(int myId, int requestId) {
        Integer requesterId = friendDao.findRequesterId(myId, requestId);
        if (requesterId == null) return "fail";

        int ok = friendDao.acceptFriendRequest(myId, requestId);
        if (ok != 1) return "fail";

        UserLiteDto me = friendDao.findUserLiteById(myId);
        String toNick = (me != null ? me.getNickName() : ("user#" + myId));

        // ✅ 1) Friends 페이지 실시간 갱신용 (기존 유지)
        sendToUser(
                requesterId,
                FriendEvent.of(
                        "FRIEND_REQUEST_ACCEPTED",
                        Map.of(
                                "toUserId", myId,
                                "toNick", toNick
                        )
                )
        );

        // ✅ 2) (선택) MyPage 통합 알림용: "수락됨" 알림도 쓰고 싶으면 유지
        // 필요 없으면 이 블록 삭제해도 됨.
        sendNotify(
                requesterId,
                "REQUEST_ACCEPTED",
                Map.of(
                        "toUserId", myId,
                        "toNick", toNick
                )
        );

        return "success";
    }

    // =========================
    // ✅ 친구 요청 거절
    // =========================
    public String rejectFriendRequest(int myId, int requestId) {
        return friendDao.rejectFriendRequest(myId, requestId) == 1 ? "success" : "fail";
    }

    // =========================
    // ✅ 친구 요청 취소(보낸 쪽)
    // =========================
    public String cancelFriendRequest(int myId, int requestId) {
        return friendDao.cancelFriendRequest(myId, requestId) == 1 ? "success" : "fail";
    }

    // =========================
    // ✅ 친구 삭제
    // =========================
    public String deleteFriend(int myId, int targetId) {
        int ok = friendDao.deleteFriend(myId, targetId);
        if (ok != 1) return "fail";

        // ✅ 1) Friends 페이지 실시간 갱신용 (기존 유지)
        sendToUser(
                targetId,
                FriendEvent.of(
                        "FRIEND_DELETED",
                        Map.of(
                                "byUserId", myId
                        )
                )
        );

        // ✅ 2) (선택) MyPage 통합 알림용: 삭제 알림도 쓰고 싶으면 유지
        // 필요 없으면 이 블록 삭제해도 됨.
        sendNotify(
                targetId,
                "FRIEND_DELETED",
                Map.of(
                        "byUserId", myId
                )
        );

        return "success";
    }
}

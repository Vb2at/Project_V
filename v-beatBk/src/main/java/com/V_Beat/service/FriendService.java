package com.V_Beat.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.V_Beat.dao.FriendDao;
import com.V_Beat.dao.MemberDao;
import com.V_Beat.dto.FriendRequest;
import com.V_Beat.dto.Member;

@Service
public class FriendService {

    private final FriendDao friendDao;
    private final MemberDao memberDao;

    public FriendService(FriendDao friendDao, MemberDao memberDao) {
        this.friendDao = friendDao;
        this.memberDao = memberDao;
    }

    // 친구 요청 보내기 (keyword: email or nickName)
    public String sendRequest(int fromUserId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) return "emp";

        Member target = memberDao.searchUser(keyword.trim());
        if (target == null) return "notFound";
        if (target.getId() == fromUserId) return "self";

        FriendRequest fr = new FriendRequest();
        fr.setFromUserId(fromUserId);
        fr.setToUserId(target.getId());

        FriendRequest relation = friendDao.findRelation(fr);
        if (relation != null) {
            if (relation.getStatus() == 0) return "alreadyPending";
            if (relation.getStatus() == 1) return "alreadyFriend";
            if (relation.getStatus() == 2) return "alreadyRejected";
        }

        friendDao.insertRequest(fr);
        return "success";
    }

    // 내가 받은 요청 목록
    public List<FriendRequest> received(int userId) {
        FriendRequest fr = new FriendRequest();
        fr.setToUserId(userId);
        return friendDao.findReceivedRequests(fr);
    }

    // 내가 보낸 요청 목록
    public List<FriendRequest> sent(int userId) {
        FriendRequest fr = new FriendRequest();
        fr.setFromUserId(userId);
        return friendDao.findSentRequests(fr);
    }

    /**
     * 친구 요청 수락
     * 1) FriendRequest status=1 업데이트
     * 2) Friend 테이블에 (나 -> 상대) insert
     * 3) Friend 테이블에 (상대 -> 나) insert
     *
     * ※ requestId만 받아도 되도록 DB에서 fromUserId/toUserId를 조회해서 처리
     */
    @Transactional
    public String accept(int userId, int requestId) {

        // requestId로 요청 정보 조회 (toUserId가 나인지 검증 포함)
        FriendRequest reqRow = friendDao.findByRequestId(requestId);
        if (reqRow == null) return "notFound";

        // 내가 받은 요청이 아니면 거절
        if (reqRow.getToUserId() != userId) return "forbidden";

        // 이미 처리된 요청이면 실패 처리
        if (reqRow.getStatus() != 0) return "alreadyHandled";

        // 1) FriendRequest 상태 변경
        FriendRequest update = new FriendRequest();
        update.setId(requestId);
        update.setToUserId(userId);

        int updated = friendDao.accept(update);
        if (updated != 1) return "fail";

        // 2) Friend 테이블 2행 INSERT
        // (나 -> 상대)
        FriendRequest aToB = new FriendRequest();
        aToB.setFromUserId(userId);
        aToB.setToUserId(reqRow.getFromUserId());
        friendDao.insertFriendOne(aToB);

        // (상대 -> 나)
        FriendRequest bToA = new FriendRequest();
        bToA.setFromUserId(reqRow.getFromUserId());
        bToA.setToUserId(userId);
        friendDao.insertFriendOne(bToA);

        return "success";
    }

    // 요청 거절
    public String reject(int userId, int requestId) {
        FriendRequest fr = new FriendRequest();
        fr.setId(requestId);
        fr.setToUserId(userId);
        return friendDao.reject(fr) == 1 ? "success" : "fail";
    }

    /**
     * 친구 목록 (Friend 테이블 기반)
     */
    public List<FriendRequest> list(int userId) {
        FriendRequest fr = new FriendRequest();
        fr.setFromUserId(userId);
        return friendDao.findFriends(fr);
    }

    /**
     * 친구 삭제(언프렌드)
     * - Friend 테이블 (나->상대), (상대->나) 2행 삭제
     * - FriendRequest(status=1) 관계도 같이 삭제
     */
    @Transactional
    public String deleteFriend(int userId, int targetUserId) {
        if (targetUserId <= 0) return "emp";
        if (userId == targetUserId) return "self";

        // Friend 2행 삭제
        FriendRequest a = new FriendRequest();
        a.setFromUserId(userId);
        a.setToUserId(targetUserId);
        int d1 = friendDao.deleteFriendOne(a);

        FriendRequest b = new FriendRequest();
        b.setFromUserId(targetUserId);
        b.setToUserId(userId);
        int d2 = friendDao.deleteFriendOne(b);

        if (d1 == 0 && d2 == 0) return "notFriend";

        // FriendRequest(status=1)도 삭제
        FriendRequest rel = new FriendRequest();
        rel.setFromUserId(userId);
        rel.setToUserId(targetUserId);
        friendDao.deleteAcceptedRelation(rel);

        return "success";
    }
}

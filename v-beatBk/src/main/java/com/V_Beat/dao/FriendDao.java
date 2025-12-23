package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.dto.FriendRequest;

@Mapper
public interface FriendDao {

    /* =========================
       FriendRequest(요청) 관련
       ========================= */

    // (추가) requestId로 요청 단건 조회 (accept에서 fromUserId 알아내기 위해 필요)
    @Select("""
        SELECT *
        FROM FriendRequest
        WHERE id = #{id}
        LIMIT 1
    """)
    FriendRequest findByRequestId(int id);

    // 양방향 관계 존재 여부(요청/친구/거절 포함)
    @Select("""
        SELECT *
        FROM FriendRequest
        WHERE (fromUserId = #{fromUserId} AND toUserId = #{toUserId})
           OR (fromUserId = #{toUserId} AND toUserId = #{fromUserId})
        LIMIT 1
    """)
    FriendRequest findRelation(FriendRequest fr);

    // 친구 요청 생성 (status=0)
    @Insert("""
        INSERT INTO FriendRequest (fromUserId, toUserId, status, regDate)
        VALUES (#{fromUserId}, #{toUserId}, 0, NOW())
    """)
    void insertRequest(FriendRequest fr);

    // 내가 받은 요청 목록 (status=0)
    @Select("""
        SELECT fr.*,
               u.nickName   AS fromNickName,
               u.profileImg AS fromProfileImg
        FROM FriendRequest fr
        JOIN `User` u ON u.id = fr.fromUserId
        WHERE fr.toUserId = #{toUserId}
          AND fr.status = 0
        ORDER BY fr.id DESC
    """)
    List<FriendRequest> findReceivedRequests(FriendRequest fr);

    // 내가 보낸 요청 목록 (status=0)
    @Select("""
        SELECT fr.*,
               u.nickName   AS toNickName,
               u.profileImg AS toProfileImg
        FROM FriendRequest fr
        JOIN `User` u ON u.id = fr.toUserId
        WHERE fr.fromUserId = #{fromUserId}
          AND fr.status = 0
        ORDER BY fr.id DESC
    """)
    List<FriendRequest> findSentRequests(FriendRequest fr);

    /**
     * 요청 수락
     * - FriendRequest.status 를 1로 변경
     * - 실제 친구 관계 생성(Friend 테이블 insert)은 insertFriendOne()으로 처리
     */
    @Update("""
        UPDATE FriendRequest
        SET status = 1, updateDate = NOW()
        WHERE id = #{id}
          AND toUserId = #{toUserId}
          AND status = 0
    """)
    int accept(FriendRequest fr);

    // 요청 거절
    @Update("""
        UPDATE FriendRequest
        SET status = 2, updateDate = NOW()
        WHERE id = #{id}
          AND toUserId = #{toUserId}
          AND status = 0
    """)
    int reject(FriendRequest fr);

    /**
     * 친구 삭제 시 FriendRequest(status=1) 기록도 함께 삭제 (양방향)
     * (추천 보강) 양쪽 친구관계가 Friend에서 지워진 뒤, 수락 기록도 함께 정리
     */
    @Delete("""
        DELETE FROM FriendRequest
        WHERE status = 1
          AND (
               (fromUserId = #{fromUserId} AND toUserId = #{toUserId})
            OR (fromUserId = #{toUserId} AND toUserId = #{fromUserId})
          )
    """)
    int deleteAcceptedRelation(FriendRequest fr);


    /* =========================
       Friend(친구관계) 관련
       ========================= */

    /**
     * Friend 테이블에 친구 관계 1행 추가 (A -> B)
     * (수락 시 2번 호출해서 A->B, B->A 생성)
     *
     * (추가 보강) 중복 insert 방지: 이미 있으면 insert 안 함
     * - MySQL 기준으로 INSERT IGNORE 사용
     * - PK(userId, friendId) 가 있어야 함
     */
    @Insert("""
        INSERT IGNORE INTO Friend (userId, friendId, regDate)
        VALUES (#{fromUserId}, #{toUserId}, NOW())
    """)
    void insertFriendOne(FriendRequest fr);

    /**
     * Friend 테이블에서 친구 관계 1행 삭제 (A -> B)
     * (삭제 시 2번 호출해서 A->B, B->A 삭제)
     */
    @Delete("""
        DELETE FROM Friend
        WHERE userId = #{fromUserId}
          AND friendId = #{toUserId}
    """)
    int deleteFriendOne(FriendRequest fr);

    /**
     * 친구 목록 조회 (Friend 테이블 기반)
     * - fromUserId에 "내 id" 담아서 호출
     */
    @Select("""
        SELECT u.id, u.nickName, u.profileImg
        FROM Friend f
        JOIN `User` u ON u.id = f.friendId
        WHERE f.userId = #{fromUserId}
        ORDER BY f.regDate DESC
    """)
    List<FriendRequest> findFriends(FriendRequest fr);
}

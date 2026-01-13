package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.*;

import com.V_Beat.dto.UserLiteDto;
import com.V_Beat.dto.FriendDto;
import com.V_Beat.dto.FriendRequestDto;

@Mapper
public interface FriendDao {

    // keyword(email or nickName)로 유저 검색
    @Select("""
        SELECT id, email, nickName
        FROM `user`
        WHERE email = #{keyword} OR nickName = #{keyword}
        LIMIT 1
    """)
    UserLiteDto searchUser(@Param("keyword") String keyword);

    // 내 정보(닉네임 알림용)
    @Select("""
        SELECT id, email, nickName
        FROM `user`
        WHERE id = #{id}
    """)
    UserLiteDto findUserLiteById(@Param("id") int id);

    // 양방향 관계 확인(요청중/친구 포함) - 하나만
    @Select("""
        SELECT id, fromUserId, toUserId, status, regDate, updateDate
        FROM FriendRequest
        WHERE (fromUserId = #{fromUserId} AND toUserId = #{toUserId})
           OR (fromUserId = #{toUserId} AND toUserId = #{fromUserId})
        LIMIT 1
    """)
    FriendRequestDto findFriendRelation(@Param("fromUserId") int fromUserId,
                                        @Param("toUserId") int toUserId);

    // 친구 요청 생성
    @Insert("""
        INSERT INTO FriendRequest (fromUserId, toUserId, status, regDate, updateDate)
        VALUES (#{fromUserId}, #{toUserId}, 0, NOW(), NOW())
    """)
    void insertFriendRequest(@Param("fromUserId") int fromUserId,
                             @Param("toUserId") int toUserId);

    // 받은 요청 목록
    @Select("""
        SELECT fr.id,
               fr.fromUserId,
               fr.toUserId,
               fr.status,
               fr.regDate,
               u.id AS otherUserId,
               u.nickName AS otherNickName,
               u.email AS otherEmail
        FROM FriendRequest fr
        JOIN `user` u ON fr.fromUserId = u.id
        WHERE fr.toUserId = #{myId}
          AND fr.status = 0
        ORDER BY fr.id DESC
    """)
    List<FriendRequestDto> findReceivedFriendRequests(@Param("myId") int myId);

    // 보낸 요청 목록
    @Select("""
        SELECT fr.id,
               fr.fromUserId,
               fr.toUserId,
               fr.status,
               fr.regDate,
               u.id AS otherUserId,
               u.nickName AS otherNickName,
               u.email AS otherEmail
        FROM FriendRequest fr
        JOIN `user` u ON fr.toUserId = u.id
        WHERE fr.fromUserId = #{myId}
          AND fr.status = 0
        ORDER BY fr.id DESC
    """)
    List<FriendRequestDto> findSentFriendRequests(@Param("myId") int myId);

    // 친구 목록
    @Select("""
        SELECT
          CASE WHEN fr.fromUserId = #{myId} THEN u2.id ELSE u1.id END AS otherUserId,
          CASE WHEN fr.fromUserId = #{myId} THEN u2.nickName ELSE u1.nickName END AS otherNickName,
          CASE WHEN fr.fromUserId = #{myId} THEN u2.email ELSE u1.email END AS otherEmail
        FROM FriendRequest fr
        JOIN `user` u1 ON fr.fromUserId = u1.id
        JOIN `user` u2 ON fr.toUserId = u2.id
        WHERE fr.status = 1
          AND (fr.fromUserId = #{myId} OR fr.toUserId = #{myId})
        ORDER BY fr.id DESC
    """)
    List<FriendDto> findFriends(@Param("myId") int myId);

    // 수락(받은 사람만 가능)
    @Update("""
        UPDATE FriendRequest
        SET status = 1, updateDate = NOW()
        WHERE id = #{requestId}
          AND toUserId = #{myId}
          AND status = 0
    """)
    int acceptFriendRequest(@Param("myId") int myId,
                            @Param("requestId") int requestId);

    // 수락/거절 시 요청자 조회
    @Select("""
        SELECT fromUserId
        FROM FriendRequest
        WHERE id = #{requestId}
          AND toUserId = #{myId}
          AND status = 0
        LIMIT 1
    """)
    Integer findRequesterId(@Param("myId") int myId,
                            @Param("requestId") int requestId);

    // 거절(삭제)
    @Delete("""
        DELETE FROM FriendRequest
        WHERE id = #{requestId}
          AND toUserId = #{myId}
          AND status = 0
    """)
    int rejectFriendRequest(@Param("myId") int myId,
                            @Param("requestId") int requestId);

    // 취소(내가 보낸 요청만)
    @Delete("""
        DELETE FROM FriendRequest
        WHERE id = #{requestId}
          AND fromUserId = #{myId}
          AND status = 0
    """)
    int cancelFriendRequest(@Param("myId") int myId,
                            @Param("requestId") int requestId);

    // 친구 삭제(친구 상태에서 양방향 삭제)
    @Delete("""
        DELETE FROM FriendRequest
        WHERE status = 1
          AND ((fromUserId = #{myId} AND toUserId = #{targetId})
            OR (fromUserId = #{targetId} AND toUserId = #{myId}))
    """)
    int deleteFriend(@Param("myId") int myId,
                     @Param("targetId") int targetId);
}

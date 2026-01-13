package com.V_Beat.dao;

import org.apache.ibatis.annotations.*;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.dto.DuelInviteDto;

@Mapper
public interface DuelDao {

    // 대기 초대 중복 체크
    @Select("""
        SELECT COUNT(*)
        FROM DuelInvite
        WHERE fromUserId = #{fromUserId}
          AND toUserId = #{toUserId}
          AND status = 0
    """)
    int countPending(@Param("fromUserId") int fromUserId,
                     @Param("toUserId") int toUserId);

    // 초대 생성 (insert 후 id 반환)
    @Insert("""
        INSERT INTO DuelInvite (fromUserId, toUserId, status, message, regDate, updateDate)
        VALUES (#{fromUserId}, #{toUserId}, 0, #{message}, NOW(), NOW())
    """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertInvite(DuelInviteDto dto);

    // 초대한 사람(fromUserId) 조회 (대기 상태만)
    @Select("""
        SELECT fromUserId
        FROM DuelInvite
        WHERE id = #{inviteId}
          AND toUserId = #{myId}
          AND status = 0
        LIMIT 1
    """)
    Integer findInviterId(@Param("myId") int myId,
                          @Param("inviteId") int inviteId);

    // 수락(status=1)
    @Update("""
        UPDATE DuelInvite
        SET status = 1, updateDate = NOW()
        WHERE id = #{inviteId}
          AND toUserId = #{myId}
          AND status = 0
    """)
    int accept(@Param("myId") int myId,
               @Param("inviteId") int inviteId);

    // 거절(status=2)
    @Update("""
        UPDATE DuelInvite
        SET status = 2, updateDate = NOW()
        WHERE id = #{inviteId}
          AND toUserId = #{myId}
          AND status = 0
    """)
    int reject(@Param("myId") int myId,
               @Param("inviteId") int inviteId);
}

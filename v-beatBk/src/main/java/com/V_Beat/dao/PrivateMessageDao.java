package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.*;

import com.V_Beat.dto.PrivateMessageDto;

@Mapper
public interface PrivateMessageDao {

    // =========================
    // 받은 쪽지함
    // =========================
    @Select("""
        SELECT
          pm.id,
          pm.from_user_id AS fromUserId,
          pm.to_user_id   AS toUserId,
          pm.title,
          pm.content,
          pm.is_read      AS isRead,
          pm.read_date    AS readDate,
          pm.reg_date     AS regDate,
          u.nickName      AS fromNickName
        FROM private_message pm
        JOIN `user` u ON u.id = pm.from_user_id
        WHERE pm.to_user_id = #{userId}
        ORDER BY pm.id DESC
    """)
    List<PrivateMessageDto> findInbox(@Param("userId") int userId);

    // =========================
    // 보낸 쪽지함
    // =========================
    @Select("""
        SELECT
          pm.id,
          pm.from_user_id AS fromUserId,
          pm.to_user_id   AS toUserId,
          pm.title,
          pm.content,
          pm.is_read      AS isRead,
          pm.read_date    AS readDate,
          pm.reg_date     AS regDate,
          u.nickName      AS toNickName
        FROM private_message pm
        JOIN `user` u ON u.id = pm.to_user_id
        WHERE pm.from_user_id = #{userId}
        ORDER BY pm.id DESC
    """)
    List<PrivateMessageDto> findSent(@Param("userId") int userId);

    // =========================
    // 쪽지 상세
    // =========================
    @Select("""
        SELECT
          pm.id,
          pm.from_user_id AS fromUserId,
          pm.to_user_id   AS toUserId,
          pm.title,
          pm.content,
          pm.is_read      AS isRead,
          pm.read_date    AS readDate,
          pm.reg_date     AS regDate,
          uf.nickName     AS fromNickName,
          ut.nickName     AS toNickName
        FROM private_message pm
        JOIN `user` uf ON uf.id = pm.from_user_id
        JOIN `user` ut ON ut.id = pm.to_user_id
        WHERE pm.id = #{id}
    """)
    PrivateMessageDto findById(@Param("id") int id);

    // =========================
    // 쪽지 전송
    // =========================
    @Insert("""
        INSERT INTO private_message
        (from_user_id, to_user_id, title, content)
        VALUES
        (#{fromUserId}, #{toUserId}, #{title}, #{content})
    """)
    int insert(@Param("fromUserId") int fromUserId,
               @Param("toUserId") int toUserId,
               @Param("title") String title,
               @Param("content") String content);

    // =========================
    // 읽음 처리
    // =========================
    @Update("""
        UPDATE private_message
        SET is_read = 1,
            read_date = NOW()
        WHERE id = #{id}
          AND to_user_id = #{userId}
    """)
    int markRead(@Param("id") int id,
                 @Param("userId") int userId);

    // =========================
    // 받은 쪽지 삭제
    // =========================
    @Delete("""
        DELETE FROM private_message
        WHERE id = #{id}
          AND to_user_id = #{userId}
    """)
    int deleteInbox(@Param("id") int id,
                    @Param("userId") int userId);

    // =========================
    // 안 읽은 쪽지 수
    // =========================
    @Select("""
        SELECT COUNT(*)
        FROM private_message
        WHERE to_user_id = #{userId}
          AND is_read = 0
    """)
    int countUnread(@Param("userId") int userId);

    // =========================
    // 유틸
    // =========================
    @Select("SELECT id FROM `user` WHERE nickName = #{nickName}")
    Integer findUserIdByNick(@Param("nickName") String nickName);

    @Select("SELECT nickName FROM `user` WHERE id = #{userId}")
    String findNickById(@Param("userId") int userId);
}

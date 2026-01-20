package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import com.V_Beat.dto.Message;

@Mapper
public interface MessageDao {

    // 메시지 생성
    @Insert("""
        INSERT INTO Message
            (channel_id, user_id, content, `type`, reg_date)
        VALUES
            (#{channelId}, #{userId}, #{content}, #{type}, NOW())
        """)
    void createMessage(int channelId, int userId, String content, int type);

    // 채널별 메시지 조회 (최근 100개)
    @Select("""
        SELECT
            m.id,
            m.channel_id   AS channelId,
            m.user_id      AS userId,
            m.content,
            m.`type`,
            m.reg_date     AS regDate,
            u.nickName,
            u.profile_img  AS profileImg
        FROM Message m
        LEFT JOIN `user` u ON m.user_id = u.id
        WHERE m.channel_id = #{channelId}
        ORDER BY m.reg_date ASC
        LIMIT 100
        """)
    List<Message> getMessages(int channelId);
}

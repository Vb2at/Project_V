package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.V_Beat.dto.Message;

@Mapper
public interface MessageDao {

    // ✅ 기존 호환 메서드 유지 (filtered=0, filter_type=NULL로 저장)
    @Insert("""
        INSERT INTO Message
            (channel_id, user_id, content, `type`, filtered, filter_type, reg_date)
        VALUES
            (#{channelId}, #{userId}, #{content}, #{type}, 0, NULL, NOW())
        """)
    void createMessage(
            @Param("channelId") int channelId,
            @Param("userId") int userId,
            @Param("content") String content,
            @Param("type") int type
    );

    // ✅ 완성형 저장 (filtered + filter_type 저장)
    @Insert("""
        INSERT INTO Message
            (channel_id, user_id, content, `type`, filtered, filter_type, reg_date)
        VALUES
            (#{channelId}, #{userId}, #{content}, #{type}, #{filtered}, #{filterType}, NOW())
        """)
    void createMessageWithFilter(
            @Param("channelId") int channelId,
            @Param("userId") int userId,
            @Param("content") String content,
            @Param("type") int type,
            @Param("filtered") boolean filtered,
            @Param("filterType") String filterType
    );

    @Select("""
        SELECT
            m.id,
            m.channel_id   AS channelId,
            m.user_id      AS userId,
            m.content,
            m.`type`,
            m.filtered     AS filtered,
            m.filter_type  AS filterType,
            m.reg_date     AS regDate,
            u.nickName,
            u.profile_img  AS profileImg
        FROM Message m
        LEFT JOIN `user` u ON m.user_id = u.id
        WHERE m.channel_id = #{channelId}
        ORDER BY m.reg_date ASC
        LIMIT 100
        """)
    List<Message> getMessages(@Param("channelId") int channelId);
}

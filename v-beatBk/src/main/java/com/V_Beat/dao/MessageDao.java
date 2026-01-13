package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import com.V_Beat.dto.Message;

@Mapper
public interface MessageDao {

    @Insert("""
        INSERT INTO Message (channelId, userId, content, type, regDate)
        VALUES (#{channelId}, #{userId}, #{content}, #{type}, NOW())
        """)
    void createMessage(int channelId, int userId, String content, int type);

    @Select("""
        SELECT m.id, m.channelId, m.userId, m.content, m.type, m.regDate,
               u.nickName, u.profileImg
        FROM Message m
        LEFT JOIN User u ON m.userId = u.id
        WHERE m.channelId = #{channelId}
        ORDER BY m.regDate ASC
        LIMIT 100
        """)
    List<Message> getMessages(int channelId);
}

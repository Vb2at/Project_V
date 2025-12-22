package com.V_Beat.dao;

import java.util.List;
import org.apache.ibatis.annotations.*;

import com.V_Beat.dto.Friend;

@Mapper
public interface InviteDao {
    
    @Insert("""
        INSERT INTO Invite (teamId, userId)
        VALUES (#{teamId}, #{userId})
    """)
    void insert (int teamId, int userId);
    
    @Select("""
        SELECT COUNT(*) 
        FROM Invite 
        WHERE teamId = #{teamId} AND userId = #{userId}
    """)
    int checkInvite(int teamId,int userId);
    
    @Select("""
        SELECT i.id, i.teamId, i.userId, i.regDate,
               t.name AS teamName, t.desc AS teamDesc,
               u.nickName AS inviterName
        FROM Invite i
        JOIN Team t ON i.teamId = t.id
        JOIN TeamMember tm ON t.id = tm.teamId AND tm.role = 0
        JOIN User u ON tm.userId = u.id
        WHERE i.userId = #{userId}
        ORDER BY i.regDate DESC
    """)
    List<Friend> getMyInvitations(int userId);
    
    @Delete("DELETE FROM Invite WHERE id = #{id}")
    void delete(int id);
    
    @Select("SELECT * FROM Invite WHERE id = #{id}")
    Friend getById(int id);
}
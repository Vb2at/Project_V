package com.V_Beat.review.dao;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface ReviewDao {
	
	//현재 페이지에 보여줄 목록 데이터
    @Select("""
        SELECT
            s.id,
            s.user_id AS userId,
            u.nickName AS uploaderNickName,
            s.title,
            s.artist,
            s.duration,
            s.diff,
            s.create_date AS createDate,
            s.cover_path AS coverPath,
            s.preview_path AS previewPath,
            s.visibility
        FROM song s
        JOIN `user` u ON u.id = s.user_id
        WHERE s.visibility = #{visibility}
        ORDER BY s.create_date DESC
        LIMIT #{limit} OFFSET #{offset}
    """)
    List<Map<String, Object>> findSongByVisibility(
            @Param("visibility") String visibility,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    //데이터 총 수 (페이지 계산용)
    @Select("""
        SELECT COUNT(*)
    		FROM song
    		WHERE visibility = #{visibility}
    """)
    int countSongByVisibility(@Param("visibility") String visibility);
}

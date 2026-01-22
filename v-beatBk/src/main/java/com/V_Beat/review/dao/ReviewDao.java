package com.V_Beat.review.dao;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.review.dto.AdminSongDetail;

@Mapper
public interface ReviewDao {

	// 현재 페이지에 보여줄 목록 데이터
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
	List<Map<String, Object>> findSongByVisibility(@Param("visibility") String visibility, @Param("limit") int limit,
			@Param("offset") int offset);

	// 데이터 총 수 (페이지 계산용)
	@Select("""
			    SELECT COUNT(*)
					FROM song
					WHERE visibility = #{visibility}
			""")
	int countSongByVisibility(@Param("visibility") String visibility);

	// 곡 상세 조회
	@Select("""
			SELECT
				s.id AS id,
				s.title AS title,
				s.artist AS artist,
				s.visibility AS visibility,
				s.diff AS diff,
				s.cover_path AS coverPath,

				s.user_id AS uploadUserId,
				u.nickName AS uploadUserNickname,

				s.create_date AS createDate,
				s.duration AS duration

			FROM song s
			JOIN `user` u
			ON u.id = s.user_id
			WHERE s.id = #{songId}
			LIMIT 1
			""")
	AdminSongDetail getSongDetail(@Param("songId") long songId);

	// 곡 처리 상태 업데이트
	@Update("""
			UPDATE song
				SET visibility = #{newVisibility},
					review_reason = #{reason},
					review_by = #{admin},
					review_at = NOW()
				WHERE id = #{songId}
			""")
	void updateSongReview(@Param("songId") long songId, @Param("newVisibility") String newVisibility,
			@Param("reason") String reason, @Param("admin") int admin);
}

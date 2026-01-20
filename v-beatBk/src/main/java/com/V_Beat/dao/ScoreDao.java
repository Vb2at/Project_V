package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.V_Beat.dto.Score;

@Mapper
public interface ScoreDao {

	@Insert("""
			INSERT INTO score
				(user_id, song_id, diff, score, accuracy, grade, max_combo, reg_date)
			VALUES
				(#{userId}, #{req.songId}, #{req.diff}, #{req.score}, #{req.accuracy}, #{req.grade}, #{req.maxCombo}, NOW())
			""")
	void save(@Param("req") Score req, @Param("userId") Long userId);
	
	// 회원탈퇴 시 점수 기록 삭제
	@Delete("""
			DELETE FROM score
			WHERE user_id = #{loginUserId}
			""")
	int deleteByUserId(@Param("loginUserId") Integer loginUserId);
	
	// 내 기록 조회
	@Select("""
			SELECT
				sc.reg_date   AS regDate,
				sn.title      AS title,
				sc.score      AS score,
				sc.accuracy   AS accuracy,
				sc.grade      AS grade,
				sc.max_combo  AS maxCombo
			FROM score sc
			JOIN song sn
			  ON sc.song_id = sn.id
			WHERE sc.user_id = #{userId}
			ORDER BY sc.reg_date DESC
			""")
	List<Score> findByUserId(@Param("userId") Integer userId);
}

package com.V_Beat.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.V_Beat.dto.Score;

@Mapper
public interface ScoreDao {

	@Insert("""
			INSERT INTO score (user_id, song_id, diff, score, accuracy, grade, max_combo)
				VALUES (#{userId}, #{req.songId}, #{req.diff}, #{req.score}, #{req.accuracy}, #{req.grade}, #{req.maxCombo})
			""")
	void save(@Param("req") Score req, @Param("userId") Long userId);
}
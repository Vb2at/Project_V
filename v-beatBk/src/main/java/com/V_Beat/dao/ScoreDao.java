package com.V_Beat.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;

import com.V_Beat.dto.Score;

@Mapper
public interface ScoreDao {

	@Insert("""
			INSERT INTO score (song_id, diff, score, accuracy, grade, max_combo)
				VALUES (#{songId}, #{diff}, #{score}, #{accuracy}, #{grade}, #{maxCombo})
			""")
	void save(Score req);
}
package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import com.V_Beat.dto.Ranking;

@Mapper
public interface RankingDao {
	
	@Select("""
			SELECT
	            u.nickName      AS nickname,
	            u.profile_img   AS profileImg,
	            s.score         AS score,
	            s.accuracy      AS accuracy,
	            s.grade         AS grade,
	            s.max_combo     AS maxCombo
	        FROM score s
	        LEFT JOIN `user` u ON u.id = s.user_id
	        WHERE s.song_id = #{songId}
	          AND s.diff = #{diff}
	        ORDER BY
	            s.score DESC,
	            s.accuracy DESC,
	            s.max_combo DESC,
	            s.reg_date DESC
	        LIMIT 100
			""")
	List<Ranking> selectRanking(long songId, String diff);

}

package com.V_Beat.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.V_Beat.dao.RankingDao;
import com.V_Beat.dto.Ranking;

@Service
public class RankingService {

	private RankingDao rankingDao;
	
	public RankingService(RankingDao rankingDao) {
		this.rankingDao = rankingDao;
	}

	public List<Ranking> getRanking(long songId, String diff) {
		return this.rankingDao.selectRanking(songId, diff);
	}
}

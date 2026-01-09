package com.V_Beat.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.V_Beat.dao.ScoreDao;
import com.V_Beat.dto.Score;

@Service
public class ScoreService {

	private ScoreDao scoreDao;
	
	public ScoreService(ScoreDao scoreDao) {
		this.scoreDao = scoreDao;
	}
	
	@Transactional
	public void save(Score req) {
		this.scoreDao.save(req);
	}

}
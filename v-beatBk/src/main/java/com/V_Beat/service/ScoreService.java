package com.V_Beat.service;

import java.util.List;

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
	public void save(Score req, Long userId) {
		this.scoreDao.save(req, userId);
	}
	
	//내 기록 족회
	public List<Score> findByUserId(Integer userId) {
		return this.scoreDao.findByUserId(userId);
	}
}
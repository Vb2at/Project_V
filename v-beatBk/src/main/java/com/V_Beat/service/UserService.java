package com.V_Beat.service;

import org.springframework.stereotype.Service;

import com.V_Beat.dao.UserDao;

@Service
public class UserService {
	
	private UserDao userDao;
	
	public UserService(UserDao userDao) {
		this.userDao = userDao;
	}
}

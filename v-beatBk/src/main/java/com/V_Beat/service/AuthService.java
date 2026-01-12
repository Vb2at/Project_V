package com.V_Beat.service;

import java.util.Random;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.V_Beat.dao.AuthDao;
import com.V_Beat.dto.User;

@Service
public class AuthService {
	
	private AuthDao authDao;
	//비밀번호 암호화
	private PasswordEncoder passwordEncoder;
	private EmailService emailService;
	
	public AuthService(AuthDao authDao, PasswordEncoder passwordEncoder, EmailService emailService) {
		this.authDao = authDao;
		this.passwordEncoder = passwordEncoder;
		this.emailService = emailService;
	}
	
	//이메일 중복 체크
	public boolean existsByEmail(String email) {
		return this.authDao.existsByEmail(email);
	}
	
	//닉네임 중복 체크
	public boolean existsByNickName(String nickName) {
		return this.authDao.existsByNickName(nickName);
	}
	
	//회원가입 처리
	public void join(User user) {
		String encoded = this.passwordEncoder.encode(user.getLoginPw());
		user.setLoginPw(encoded);
		this.authDao.join(user);
	}

	//로그인 처리
	public User doLogin(String email, String loginPw) {
		User user = this.authDao.getUserByEmail(email);
		
		if(user == null) {
			return null;
		}
		
		//암호화 비번 로그인 비번 매칭
		if(!this.passwordEncoder.matches(loginPw, user.getLoginPw())) {
			return null;
		}
		
		return user;
	}
	
	//이메일 조회
	public User findByEmail(String email) {
		return this.authDao.getUserByEmail(email);
	}
	
	//임시 비밀번호 생성 (8자리 영문 + 숫자)
	public String generateTempPassword() {
		String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		StringBuilder tempPw = new StringBuilder();
		Random random = new Random();
		
		for(int i = 0; i< 8; i ++) {
			tempPw.append(chars.charAt(random.nextInt(chars.length())));
		}
		
		return tempPw.toString();
	}
	
	//비밀번호 찾기
	public void resetPw(String email) {
		//이메일로 회원 조회
		User user = this.authDao.getUserByEmail(email);
		if(user == null) {
			throw new IllegalArgumentException("등록되지 않은 이메일입니다.");
		}
		
		//8자리 임시 비밀번호 생성
		String tempPw = generateTempPassword();
		
		//BCrypt로 암호화
		String endoedPw = this.passwordEncoder.encode(tempPw);
		
		//DB에 암호화된 임시 비밀번호로 업데이트
		this.authDao.updatePw(user.getId(), endoedPw);
		
		//평문 임시 비밀번호를 이메일로 발송
		this.emailService.sendTempPw(email, tempPw);
	}
}

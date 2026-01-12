package com.V_Beat.service;

import java.io.File;
import java.util.Random;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dao.MemberDao;
import com.V_Beat.dto.User;


@Service
public class MemberService {

	private MemberDao memberDao;
	private BCryptPasswordEncoder passwordEncoder; // 비밀번호 암호화
	private EmailService emailService;

	public MemberService(MemberDao memberDao, BCryptPasswordEncoder passwordEncoder, EmailService emailService) {
		this.memberDao = memberDao;
		this.passwordEncoder = passwordEncoder;
		this.emailService = emailService;
	}

	// socialId로 회원 조회
	public User findBySocialId(String socialId, int loginType) {
	    return this.memberDao.findBySocialId(socialId, loginType);
	}

	// 소셜 로그인 회원가입 (비밀번호 암호화 생략)
	public void joinSocial(User member) {
	    this.memberDao.join(member);
	}
	
	// 회원가입
	public void join(User member) {
		// 비밀번호 BCrypt 암호화 (단방향 해시)
		String encodePW = passwordEncoder.encode(member.getLoginPw());
		member.setLoginPw(encodePW);

		// DB INSERT
		this.memberDao.join(member);
	}

	// 닉네임으로 회원 조회
	public User findByNickName(String nickName) {
		return this.memberDao.findByNickName(nickName);
	}

	// 로그인 처리
	public User login(String email, String loginPw) {
	    // 1. 이메일로 회원 조회
	    User member = this.memberDao.findByEmail(email);
	    if (member == null) {
	        return null; // 존재하지 않는 이메일
	    }

	    // 2. 소셜 로그인 회원은 일반 로그인 불가
	    if (member.getLoginType() != 0) {
	        return null; // 소셜 로그인 계정
	    }

	    // 3. BCrypt로 비밀번호 비교
	    if (passwordEncoder.matches(loginPw, member.getLoginPw())) {
	        return member; // 로그인 성공
	    }

	    return null; // 비밀번호 불일치
	}
	// 이메일로 회원 조회
	public User findByEmail(String email) {
		return this.memberDao.findByEmail(email);
	}

	// 임시 비밀번호 생성 (8자리 영문+숫자)
	public String generateTempPassword() {
		String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		StringBuilder tempPw = new StringBuilder();
		Random random = new Random();

		for (int i = 0; i < 8; i++) {
			tempPw.append(chars.charAt(random.nextInt(chars.length())));
		}

		return tempPw.toString();
	}

	// 비밀번호 찾기 (임시 비밀번호 발급)
	public void resetPw(String email) {
		// 8자리 임시 비밀번호 생성
		String tempPw = generateTempPassword();

		// BCrypt로 암호화
		String encodedPw = passwordEncoder.encode(tempPw);

		// 이메일로 회원 조회
		User member = this.memberDao.findByEmail(email);

		// DB에 암호화된 임시 비밀번호로 업데이트
		this.memberDao.updatePw(member.getId(), encodedPw);

		// 평문 임시 비밀번호를 이메일로 발송
		this.emailService.sendTempPw(email, tempPw);
	}

	// 닉네임 변경
	public String changeNickName(int id, String newNickName) {
		// 공백 검증
		if (newNickName == null || newNickName.trim().isEmpty()) {
			return "emp";
		}
		// 중복 체크
		User dupNickname = memberDao.findByNickName(newNickName);
		if (dupNickname != null) {
			return "dup";
		}
		// 변경 실행
		memberDao.updateNickName(id, newNickName.trim());
		return "success";
	}

	// 비밀번호 변경
	public String changePassword(int id, String loginPw, String newPw) {
		// 공백 검증
		if (loginPw == null || newPw == null || loginPw.trim().isEmpty() || newPw.trim().isEmpty()) {
			return "emp";
		}
		// 현재 비밀번호 확인
		User member = memberDao.findById(id);
		if (!passwordEncoder.matches(loginPw, member.getLoginPw())) {
			return "diff";
		}
		// 새로 박은 비밀번호 암호화
		String encodedNewPw = passwordEncoder.encode(newPw);
		// 비밀번호 저장
		memberDao.updatePassword(id, encodedNewPw);

		return "success";
	}

	public String updateProfileImg(int id, MultipartFile file) {
		// 파일 검증
		if (file == null || file.isEmpty()) {
			return "emp";
		}
		// 파일 확장자 검증
		String originName = file.getOriginalFilename();
		String ext = originName.substring(originName.lastIndexOf("."));
		if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)$")) {
			return "noneType";
		}

		try {

			// 파일 저장경로 생성
			String uploadDir = "C:/DiscoDing/upload/profile/";
			File dir = new File(uploadDir);
			if (!dir.exists()) {
				dir.mkdirs();
			}
			// 파일명 생성
			String fileName = System.currentTimeMillis() + "_" + id + ext;
			String filePath = uploadDir + fileName;

			file.transferTo(new File(filePath));

			// DB 업데이트
			String webPath = "/upload/profile/" + fileName;
			memberDao.updateProfileImg(id, webPath);

			return "success";

		} catch (Exception e) {
			e.printStackTrace();
			return "error";
		}
	}

	public String deleteAccount(int id) {
		if (memberDao.checkLeader(id)) {
			return "isLeader";
		}
		memberDao.deleteAccount(id);
		return "success";
	}

	// 회원 ID로 조회
	public User findById(int id) {
		return this.memberDao.findById(id);
	}

}
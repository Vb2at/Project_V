package com.V_Beat.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.dto.CheckReq;
import com.V_Beat.dto.User;
import com.V_Beat.service.AuthService;
import com.V_Beat.service.EmailService;
import com.V_Beat.service.VerificationService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private AuthService authService;
	private EmailService emailService;
	private VerificationService verificationService;
	
	public AuthController(AuthService authService,
						  EmailService emailService, VerificationService verificationService) {
		this.authService = authService;
		this.emailService = emailService;
		this.verificationService = verificationService;
	}
	
	//비밀번호 입력 검증(AJAX)
	@PostMapping("/check-loginPw")
	public Map<String, Object> checkLoginPw(@RequestBody CheckReq req) {
		Map<String, Object> res = new HashMap<>();
		
		if(req.getLoginPw() == null || req.getLoginPw().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "비밀번호를 입력하세요.");
			return res;
		}
		
		res.put("ok", true);
		return res;
	}
	
	//닉네임 중복 체크(AJAX)
	@PostMapping("/check-nickname")
	public Map<String, Object> checkNickname(@RequestBody CheckReq req) {
		Map<String, Object> res = new HashMap<>();
		
		String nickName = (req.getNickName() == null) ? "" : req.getNickName().trim();
		
		if(nickName.isEmpty()) {
			res.put("ok", false);
			res.put("message", "닉네임을 입력하세요.");
			return res;
		}
		
		if(this.authService.existsByNickName(nickName)) {
			res.put("ok", false);
			res.put("message", "이미 사용중인 닉네임입니다.");
			return res;
		}
		
		res.put("ok", true);
		res.put("message", String.format("%s는(은) 사용 가능한 닉네임입니다.", nickName));
		return res;
	}
	
	//이메일 검증(중복 체크)
	@PostMapping("/check-email")
	public Map<String, Object> checkEmail(@RequestBody CheckReq req) {
		Map<String, Object> res = new HashMap<>();
		
		if(req.getEmail() == null || req.getEmail().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "이메일을 입력하세요.");
			return res;
		}
		
		if(this.authService.existsByEmail(req.getEmail())) {
			res.put("ok", false);
			res.put("message", "이미 사용 중인 이메일입니다.");
			return res;
		}
		
		res.put("ok", true);
		return res;
	}
	
	//이메일 인증코드 발송
	@PostMapping("/sendCode")
	public Map<String, Object> sendCode(@RequestBody CheckReq req) {
		Map<String, Object> res = new HashMap<>();
		
		if(req.getEmail() == null || req.getEmail().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "이메일을 입력하세요.");
			return res;
		}
		
		try {
			String email = req.getEmail().trim();
			String code = this.emailService.generateCode();  //6자리 랜덤 코드 생성
			this.verificationService.saveVerification(email, code);
			this.emailService.sendVerificationCode(email, code);	//SMTP로 이메일 발송
			
			res.put("ok", true);
			return res;
		} catch(Exception e) {
			res.put("ok", false);
			res.put("message", "인증코드 발송에 실패하였습니다.");
			return res;
		}
	}
	
	//이메일 인증 코드 검증
	@PostMapping("/verifyCode")
	public Map<String, Object> verifyCode(@RequestBody CheckReq req) {
		Map<String, Object> res = new HashMap<>();
		
		if(req.getEmail() == null || req.getEmail().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "이메일을 입력하세요.");
			return res;
		}
		
		if(req.getCode() == null || req.getCode().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "인증코드를 입력하세요.");
			return res;
		}
		
		if(this.verificationService.verifyCode(req.getEmail(), req.getCode())) {
			res.put("ok", true);
			return res;
		}
		
		res.put("ok", false);
		res.put("message", "인증코드가 일치하지 않습니다.");
		return res;
	}
	
	//회원가입 처리
	@PostMapping("/doJoin")
	public Map<String, Object> doJoin(@RequestBody CheckReq req) {
		Map<String, Object> res = new HashMap<>();
		
		//입력 여부 확인
	    if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
	        res.put("ok", false);
	        res.put("message", "이메일을 입력하세요.");
	        return res;
	    }
	    if (req.getNickName() == null || req.getNickName().trim().isEmpty()) {
	        res.put("ok", false);
	        res.put("message", "닉네임을 입력하세요.");
	        return res;
	    }
	    if (req.getLoginPw() == null || req.getLoginPw().trim().isEmpty()) {
	        res.put("ok", false);
	        res.put("message", "비밀번호를 입력하세요.");
	        return res;
	    }
	    
	    //이메일 인증 여부
		if(!this.verificationService.isVerified(req.getEmail())) {
			res.put("ok", false);
			res.put("message", "이메일 인증이 필요합니다.");
			return res;
		}
		
		//중복 체크
		if(this.authService.existsByEmail(req.getEmail())) {
			res.put("ok", false);
			res.put("message", "이미 사용 중인 이메일입니다.");
			return res;
		}
		
		if(this.authService.existsByNickName(req.getNickName())) {
			res.put("ok", false);
			res.put("message", "이미 사용 중인 닉네임입니다.");
			return res;
		}
		
		try {
			//User 객체 생성
			User user = new User();
			user.setEmail(req.getEmail().trim());
			user.setNickName(req.getNickName().trim());
			user.setLoginPw(req.getLoginPw());
			user.setLoginType(0);
			
			//회원가입
			this.authService.join(user);
			//인증 정보 삭제
			this.verificationService.removeVerification(req.getEmail());
			
			res.put("ok", true);
			return res;
			
		} catch(Exception e) {
			res.put("ok", false);
			res.put("message", "회원가입에 실패하였습니다.");
			return res;
		}
	}
	
	//로그인 처리
	@PostMapping("/doLogin")
	public Map<String, Object> doLogin(@RequestBody CheckReq req, HttpSession session) {
		Map<String, Object> res = new HashMap<>();
		
		if(req.getEmail() == null || req.getEmail().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "이메일을 입력해주세요.");
			return res;
		}
		
		if(req.getLoginPw() == null || req.getLoginPw().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "비밀번호를 입력해주세요.");
			return res;
		}
		
		User user = this.authService.doLogin(req.getEmail(), req.getLoginPw());
		if(user == null) {
			res.put("ok", false);
			res.put("message", "이메일 또는 비밀번호를 확인해 주세요.");
			return res;
		}
		
		session.setAttribute("loginUser", user.getEmail());
		session.setAttribute("loginUserNickName", user.getNickName());
		session.setAttribute("loginUserId", user.getId());
		
		res.put("ok", true);
		res.put("message", String.format("%s님 환영합니다!", user.getNickName()));
		return res;
	}
	
	//로그아웃 처리
	@PostMapping("/logout")
	public Map<String, Object> logout(HttpSession session) {
		Map<String, Object> res = new HashMap<>();
		
		session.invalidate();
		
		res.put("ok", true);
		res.put("message", "로그아웃 되었습니다.");
		return res;
	}
	
	//임시 비밀번호 발송
	@PostMapping("/sendTempPw")
	public Map<String, Object> sendTempPw(@RequestBody CheckReq req) {
		Map<String, Object> res = new HashMap<>();
		
		if(req.getEmail() == null || req.getEmail().trim().isEmpty()) {
			res.put("ok", false);
			res.put("message", "이메일을 입력하세요.");
			return res;
		}
		
		try {
			User user = this.authService.findByEmail(req.getEmail());
			
			if(user == null) {
				res.put("ok", false);
				res.put("message", "등록되지 않은 이메일입니다.");
				return res;
			}
			
			this.authService.resetPw(req.getEmail());
			
			res.put("ok", true);
			res.put("message", "임시 비밀번호가 메일로 발송되었습니다.");
			return res;
			
		} catch(Exception e) {
			e.printStackTrace();
			res.put("ok", false);
			res.put("message", "임시 비밀번호 발송에 실패하였습니다.");
			return res;
		}
	}
}

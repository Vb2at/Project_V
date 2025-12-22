package com.V_Beat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dto.Member;
import com.V_Beat.dto.Req;
import com.V_Beat.service.EmailService;
import com.V_Beat.service.MemberService;
import com.V_Beat.service.VerificationService;
import com.V_Beat.util.Util;


@Controller
public class MemberController {
	
	private MemberService memberService;
	private final Req req;  // 세션 관리 객체
	
	// 생성자 주입
	public MemberController(MemberService memberService, Req req) {
	    this.memberService = memberService;
	    this.req = req;
	}
	
	// 일반 회원가입 페이지
	@GetMapping("/user/member/join")
	public String joinNormal(Model model) {
	    model.addAttribute("pageTitle", "회원가입");
	    return "/user/member/join";
	}
	
	
	//비밀번호 입력 검증 (AJAX)
	@GetMapping("/user/member/iptLoginPw")
	@ResponseBody
	public String iptLoginPw(String loginPw) {
		if (loginPw == null || loginPw.trim().isEmpty()) return "gap";
		return "pass";
	}
	
	// 비밀번호 확인 일치 검증 (AJAX) 
	@GetMapping("/user/member/chkLoginPw")
	@ResponseBody
	public String chkLoginPw(String loginPw, String loginPwChk) {
		if (loginPwChk == null || loginPwChk.trim().isEmpty()) return "gap";  // 입력값 없음
		if (!loginPw.equals(loginPwChk)) return "diff";  // 불일치
		return "pass";  // 일치
	}
	
	// 닉네임 중복 체크 (AJAX) 
	@GetMapping("/user/member/chkNickName")
	@ResponseBody
	public String chkNickName(String nickName) {
		if (nickName == null || nickName.trim().isEmpty()) return "gap";
		if (memberService.findByNickName(nickName) != null) return "dup";
		return "pass";
	}
	
	// 이메일 검증 
	@GetMapping("/user/member/chkEmail")
	@ResponseBody
	public String chkEmail(String email) {
		if (email == null || email.trim().isEmpty()) return "gap";
		if (memberService.findByEmail(email) != null) return "dup";
		return "pass";
	}
	
	// 필드 주입 (EmailService, VerificationService)
	@Autowired
	private EmailService emailService;

	@Autowired
	private VerificationService verificationService;

	//  이메일 인증 코드 발송
	@PostMapping("/user/member/sendCode")
	@ResponseBody
	public String sendCode(String email) {
	    try {
	        String code = emailService.generateCode();  // 6자리 랜덤 코드 생성
	        verificationService.saveVerification(email, code);  // Redis/메모리에 저장 (5분 TTL)
	        emailService.sendVerificationCode(email, code);  // SMTP로 이메일 발송
	        return "success";
	    } catch (Exception e) {
	        return "fail";
	    }
	}

	//  이메일 인증 코드 검증
	@PostMapping("/user/member/verifyCode")
	@ResponseBody
	public String verifyCode(String email, String code) {
	    if (verificationService.verifyCode(email, code)) {  // 저장된 코드와 비교
	        return "success";
	    }
	    return "fail";
	}

	//  회원가입 처리 
	@PostMapping("/user/member/doJoin")
	@ResponseBody
	public String doJoin(String loginPw, String nickName, String email) {
	    try {
	        // 이메일 인증 완료 여부 확인
	        if (!verificationService.isVerified(email)) {
	            return Util.jsReplace("이메일 인증이 필요합니다.", "/user/member/join");
	        }
	        
	        // Member 객체 생성
	        Member member = new Member();
	        member.setLoginPw(loginPw);  // Service에서 BCrypt 암호화
	        member.setNickName(nickName);
	        member.setEmail(email);
	        member.setLoginType(0);
	        
	        memberService.join(member);  // DB INSERT
	        verificationService.removeVerification(email);  // 인증 정보 삭제
	        
	        return Util.jsReplace("가입이 완료되었습니다.", "/user/member/login");
	    } catch (Exception e) {
	        return Util.jsReplace("이미 사용 중인 정보입니다.", "/user/member/join");
	    }
	}
	
	//  로그인 페이지
	@GetMapping("/user/member/login")
	public String login(Model model) {
		model.addAttribute("pageTitle", "로그인");
		return "/user/member/login";
	}
	
	//  로그인 처리 
	@PostMapping("/user/member/doLogin")
	@ResponseBody
	public String doLogin(String email, String loginPw) {
	    // 아이디 입력 확인
	    if (email == null || email.trim().isEmpty()) {
	        return Util.jsReplace("이메일을 입력해주세요.", "/user/member/login");
	    }
	    // 비밀번호 입력 확인
	    if (loginPw == null || loginPw.trim().isEmpty()) {
	        return Util.jsReplace("비밀번호를 입력해주세요.", "/user/member/login");
	    }
	    
	    // DB 조회 + BCrypt 비밀번호 비교
	    Member member = memberService.login(email, loginPw);
		if (member == null) {
			return Util.jsReplace("이메일 또는 비밀번호가 일치하지 않습니다.", "/user/member/login");
		}
		
		// 세션에 사용자 정보 저장
		this.req.login(member);
		return Util.jsReplace(String.format("%s님 환영합니다!", member.getNickName()), "/");
	}
	
	// 로그아웃 
	@GetMapping("/user/member/logout")
	@ResponseBody
	public String logout() {
		this.req.logout();  // 세션 무효화
		return Util.jsReplace("로그아웃 되었습니다.", "/");
	}
	
	//  비밀번호 찾기 페이지
	@GetMapping("/user/member/rePw")
	public String rePassword() {
		return ("/user/member/rePw");
	}
	
	//  임시 비밀번호 발송 
	@PostMapping("/user/member/sendTempPw")
	@ResponseBody
	public String sendTempPW(String email) {
		try {
			// 이메일로 사용자 조회
			Member member = memberService.findByEmail(email);
			
			if (member == null) {
				return "notFound";  // 등록되지 않은 이메일
			}
			
			// 임시 비밀번호 생성 + DB 업데이트 + 이메일 발송
			memberService.resetPw(email);
			
			return "success";
		} catch (Exception e) {
			e.printStackTrace();
			return "fail";
		}
	}
	@GetMapping("user/member/profile")
	public String profile(String loginId, String email) {
		return("user/member/profile");
	}
	
	//	 닉네임 변경 
	@PostMapping("/user/member/changeNickName")
	@ResponseBody
	public String changeNickName(String nickName) {
		// 사용자 로그인 여부 
		if(req.getLoginMember() == null) {
			return "needLogin";
		}// 서비스에서 비즈니스 로직 검증
		String result = memberService.changeNickName(req.getLoginMemberId(), nickName);
	    if(result.equals("success")) {
	        Member updatedMember = memberService.findById(req.getLoginMemberId());
	        req.login(updatedMember);
	    }
			return result;
	}
	// 비밀번호 변경 
	@PostMapping("/user/member/changePw")
	@ResponseBody
	public String changePw(String loginPw, String newPw) {
		if(req.getLoginMember()==null) {
			return "needLogin";
		}
		return memberService.changePassword(req.getLoginMemberId(), loginPw, newPw);
	}
	// 프로필 이미지 업로드 
	@PostMapping("/user/member/uploadProfile")
	@ResponseBody
	public String uploadprofile(MultipartFile profileImg) {
		if(req.getLoginMember() == null) {
			return "needLogin";
		}
		return memberService.updateProfileImg(req.getLoginMemberId(), profileImg);
	}
	@PostMapping("/user/member/deleteAccount")
	@ResponseBody
	public String deleteAccount() {
		if(req.getLoginMember() == null) {
			return "needLogin";
		}
		String result = memberService.deleteAccount(req.getLoginMemberId());
		if(result.equals("success")) {
			req.logout();
		}
		return result;
	}
	
}
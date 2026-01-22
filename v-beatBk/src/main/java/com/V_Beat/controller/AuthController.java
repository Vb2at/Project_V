package com.V_Beat.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.dao.UserDao;
import com.V_Beat.dto.CheckReq;
import com.V_Beat.dto.User;
import com.V_Beat.service.AuthService;
import com.V_Beat.service.EmailService;
import com.V_Beat.service.ProfanityFilterService; // ✅ 추가
import com.V_Beat.service.VerificationService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserDao userDao;
    private final EmailService emailService;
    private final VerificationService verificationService;

    // ✅ 추가: 닉네임 AJAX 체크용(최종 방어는 AuthService/UserService에서 하지만 UX 일관성 위해 컨트롤러에서도 체크)
    private final ProfanityFilterService profanityFilterService;

    public AuthController(AuthService authService,
                          EmailService emailService,
                          VerificationService verificationService,
                          UserDao userDao,
                          ProfanityFilterService profanityFilterService) {
        this.authService = authService;
        this.emailService = emailService;
        this.verificationService = verificationService;
        this.userDao = userDao;
        this.profanityFilterService = profanityFilterService;
    }

    // 비밀번호 입력 검증(AJAX)
    @PostMapping("/check-loginPw")
    public Map<String, Object> checkLoginPw(@RequestBody CheckReq req) {
        Map<String, Object> res = new HashMap<>();

        if (req.getLoginPw() == null || req.getLoginPw().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "비밀번호를 입력하세요.");
            return res;
        }

        res.put("ok", true);
        return res;
    }

    // 닉네임 중복 체크(AJAX) + ✅ 비속어 체크
    @PostMapping("/check-nickname")
    public Map<String, Object> checkNickname(@RequestBody CheckReq req) {
        Map<String, Object> res = new HashMap<>();

        String nickName = (req.getNickName() == null) ? "" : req.getNickName().trim();

        if (nickName.isEmpty()) {
            res.put("ok", false);
            res.put("message", "닉네임을 입력하세요.");
            return res;
        }

        // ✅ 추가: 비속어/욕설 닉네임 차단
        if (profanityFilterService.containsProfanity(nickName)) {
            res.put("ok", false);
            res.put("message", "적절하지 않은 닉네임입니다.");
            return res;
        }

        if (this.authService.existsByNickName(nickName)) {
            res.put("ok", false);
            res.put("message", "이미 사용중인 닉네임입니다.");
            return res;
        }

        res.put("ok", true);
        res.put("message", String.format("%s는(은) 사용 가능한 닉네임입니다.", nickName));
        return res;
    }

    // 이메일 검증(중복 체크)
    @PostMapping("/check-email")
    public Map<String, Object> checkEmail(@RequestBody CheckReq req) {
        Map<String, Object> res = new HashMap<>();

        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "이메일을 입력하세요.");
            return res;
        }

        String email = req.getEmail().trim();

        if (this.authService.existsByEmail(email)) {
            res.put("ok", false);
            res.put("message", "이미 사용 중인 이메일입니다.");
            return res;
        }

        res.put("ok", true);
        return res;
    }

    // 이메일 인증코드 발송
    @PostMapping("/sendCode")
    public Map<String, Object> sendCode(@RequestBody CheckReq req) {
        Map<String, Object> res = new HashMap<>();

        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "이메일을 입력하세요.");
            return res;
        }

        try {
            String email = req.getEmail().trim();
            String code = this.emailService.generateCode(); // 6자리 랜덤 코드 생성
            this.verificationService.saveVerification(email, code);
            this.emailService.sendVerificationCode(email, code); // SMTP로 이메일 발송

            res.put("ok", true);
            return res;
        } catch (Exception e) {
            res.put("ok", false);
            res.put("message", "인증코드 발송에 실패하였습니다.");
            return res;
        }
    }

    // 이메일 인증 코드 검증
    @PostMapping("/verifyCode")
    public Map<String, Object> verifyCode(@RequestBody CheckReq req) {
        Map<String, Object> res = new HashMap<>();

        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "이메일을 입력하세요.");
            return res;
        }

        if (req.getCode() == null || req.getCode().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "인증코드를 입력하세요.");
            return res;
        }

        if (this.verificationService.verifyCode(req.getEmail(), req.getCode())) {
            res.put("ok", true);
            return res;
        }

        res.put("ok", false);
        res.put("message", "인증코드가 일치하지 않습니다.");
        return res;
    }

    // 회원가입 처리
    @PostMapping("/doJoin")
    public Map<String, Object> doJoin(@RequestBody CheckReq req) {
        Map<String, Object> res = new HashMap<>();

        // 입력 여부 확인
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

        String email = req.getEmail().trim();
        String nickName = req.getNickName().trim();

        // ✅ 닉네임 비속어 체크 (최종 방어는 AuthService에서 하지만, 여기서도 빠르게 UX 제공)
        if (profanityFilterService.containsProfanity(nickName)) {
            res.put("ok", false);
            res.put("message", "적절하지 않은 닉네임입니다.");
            return res;
        }

        // 이메일 인증 여부
        if (!this.verificationService.isVerified(email)) {
            res.put("ok", false);
            res.put("message", "이메일 인증이 필요합니다.");
            return res;
        }

        // 중복 체크
        if (this.authService.existsByEmail(email)) {
            res.put("ok", false);
            res.put("message", "이미 사용 중인 이메일입니다.");
            return res;
        }

        if (this.authService.existsByNickName(nickName)) {
            res.put("ok", false);
            res.put("message", "이미 사용 중인 닉네임입니다.");
            return res;
        }

        try {
            // User 객체 생성
            User user = new User();
            user.setEmail(email);
            user.setNickName(nickName);
            user.setLoginPw(req.getLoginPw());
            user.setLoginType(0);
            user.setRole(req.getRole());

            // 회원가입 (여기서도 AuthService 내부에서 닉네임 검증 수행)
            this.authService.join(user);

            // 인증 정보 삭제
            this.verificationService.removeVerification(email);

            res.put("ok", true);
            return res;

        } catch (IllegalArgumentException e) {
            // ✅ 서비스에서 던진 검증 메시지를 그대로 프론트에 전달 (닉네임 비속어 등)
            res.put("ok", false);
            res.put("message", e.getMessage());
            return res;

        } catch (Exception e) {
            res.put("ok", false);
            res.put("message", "회원가입에 실패하였습니다.");
            return res;
        }
    }

    // 로그인 처리
    @PostMapping("/doLogin")
    public Map<String, Object> doLogin(@RequestBody CheckReq req, HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "이메일을 입력해주세요.");
            return res;
        }

        if (req.getLoginPw() == null || req.getLoginPw().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "비밀번호를 입력해주세요.");
            return res;
        }

        User user = this.authService.doLogin(req.getEmail(), req.getLoginPw());
        if (user == null) {
            res.put("ok", false);
            res.put("message", "이메일 또는 비밀번호를 확인해 주세요.");
            return res;
        }

        session.setAttribute("loginUser", user);
        session.setAttribute("loginUserNickName", user.getNickName());
        session.setAttribute("loginUserId", user.getId());
        session.setAttribute("loginUserRole", user.getRole());

        res.put("ok", true);
        res.put("message", String.format("%s님 환영합니다!", user.getNickName()));
        return res;
    }

    // 로그아웃 처리
    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();

        // 없으면 만들지 않도록
        HttpSession session = request.getSession(false);
        if (session != null) {
            // 있으면 파괴
            session.invalidate();
        }

        res.put("ok", true);
        return res;
    }

    // 임시 비밀번호 발송
    @PostMapping("/sendTempPw")
    public Map<String, Object> sendTempPw(@RequestBody CheckReq req) {
        Map<String, Object> res = new HashMap<>();

        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            res.put("ok", false);
            res.put("message", "이메일을 입력하세요.");
            return res;
        }

        try {
            User user = this.authService.findByEmail(req.getEmail());

            if (user == null) {
                res.put("ok", false);
                res.put("message", "등록되지 않은 이메일입니다.");
                return res;
            }

            this.authService.resetPw(req.getEmail());

            res.put("ok", true);
            res.put("message", "임시 비밀번호가 메일로 발송되었습니다.");
            return res;

        } catch (Exception e) {
            e.printStackTrace();
            res.put("ok", false);
            res.put("message", "임시 비밀번호 발송에 실패하였습니다.");
            return res;
        }
    }

    // 로그인 상태 확인(프론트에서는 세션값을 직접 알 수 없어 필수)
    @GetMapping("/login/status")
    public Map<String, Object> loginStatus(HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();

        HttpSession session = request.getSession(false);
        if (session == null) {
            res.put("ok", false);
            res.put("loginUserId", null);
            res.put("loginUser", null);
            res.put("loginUserNickName", null);
            return res;
        }

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("loginUserId", null);
            res.put("loginUser", null);
            res.put("loginUserNickName", null);
            return res;
        }

        // 항상 DB에서 최신 유저 조회
        User fresh = userDao.findById(loginUserId);
        if (fresh == null) {
            session.invalidate();
            res.put("ok", false);
            res.put("loginUserId", null);
            res.put("loginUser", null);
            res.put("loginUserNickName", null);
            return res;
        }

        // 세션도 최신으로 갱신
        session.setAttribute("loginUser", fresh);
        session.setAttribute("loginUserNickName", fresh.getNickName());
        session.setAttribute("loginUserRole", fresh.getRole());

        res.put("ok", true);
        res.put("loginUserId", fresh.getId());
        res.put("loginUser", fresh);
        res.put("loginUserNickName", fresh.getNickName());
        res.put("loginUserRole", fresh.getRole());
        return res;
    }
}

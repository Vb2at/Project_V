package com.V_Beat.service;

import java.util.Random;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.V_Beat.dao.AuthDao;
import com.V_Beat.dto.User;

@Service
public class AuthService {

    private final AuthDao authDao;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // ✅ 추가: 로컬 badwords.txt 기반 필터
    private final ProfanityFilterService profanityFilterService;

    public AuthService(AuthDao authDao,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       ProfanityFilterService profanityFilterService) {
        this.authDao = authDao;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.profanityFilterService = profanityFilterService;
    }

    // 이메일 중복 체크
    public boolean existsByEmail(String email) {
        return this.authDao.existsByEmail(email);
    }

    // 닉네임 중복 체크
    public boolean existsByNickName(String nickName) {
        return this.authDao.existsByNickName(nickName);
    }

    // =========================
    // ✅ 회원가입 처리 (일반)
    // =========================
    public void join(User user) {
        if (user == null) throw new IllegalArgumentException("user is null");

        // ✅ 닉네임 비속어 검사 (가입 전에 차단)
        profanityFilterService.validateNicknameOrThrow(user.getNickName());

        String encoded = this.passwordEncoder.encode(user.getLoginPw());
        user.setLoginPw(encoded);

        this.authDao.join(user);
    }

    // =========================
    // ✅ 소셜 로그인 가입 (kakao, google)
    // =========================
    public void joinSocial(User user) {
        if (user == null) {
            throw new IllegalArgumentException("user is null");
        }

        if (user.getSocialId() == null || user.getSocialId().trim().isEmpty()) {
            throw new IllegalArgumentException("socialId is null");
        }

        // 중복 가입 방지
        User exists = this.authDao.findBySocialId(user.getSocialId(), user.getLoginType());
        if (exists != null) {
            return;
        }

        // 닉네임 후보 만들기
        String baseNick = user.getNickName();
        if (baseNick == null || baseNick.trim().isEmpty()) {
            baseNick = "user";
        }
        baseNick = baseNick.trim();

        // ✅ baseNick 자체도 먼저 검사 (baseNick이 욕설이면 즉시 차단)
        profanityFilterService.validateNicknameOrThrow(baseNick);

        // 닉네임 중복 방지 + ✅ 후보마다 욕설 검사
        String candidate = baseNick;
        int suffix = 1;

        while (true) {
            // 1) 중복 체크
            boolean duplicated = this.authDao.existsByNickName(candidate);

            // 2) 욕설 체크
            boolean hasProfanity = profanityFilterService.containsProfanity(candidate);

            if (!duplicated && !hasProfanity) {
                break; // 사용 가능
            }

            candidate = baseNick + "_" + suffix;
            suffix++;

            if (suffix > 9999) {
                // 너무 오래 걸리면 시간 기반으로 탈출 (그래도 욕설 검사는 한번 더)
                candidate = baseNick + "_" + System.currentTimeMillis();
                if (profanityFilterService.containsProfanity(candidate)) {
                    throw new IllegalArgumentException("적절하지 않은 닉네임입니다");
                }
                break;
            }
        }

        user.setNickName(candidate);

        // DB에 저장
        this.authDao.joinBySocialId(user);
    }

    // =========================
    // 로그인 처리
    // =========================
    public User doLogin(String email, String loginPw) {
        User user = this.authDao.getUserByEmail(email);

        if (user == null) {
            return null;
        }

        // 소셜 계정이라면 일반 로그인 차단
        if (user.getLoginType() != 0) {
            return null;
        }

        // 비번 입력안하면 로그인 차단 (소셜 로그인은 비번 입력이 없음)
        if (user.getLoginPw() == null) {
            return null;
        }

        // 암호화 비번 로그인 비번 매칭
        if (!this.passwordEncoder.matches(loginPw, user.getLoginPw())) {
            return null;
        }

        return user;
    }

    // 이메일 조회
    public User findByEmail(String email) {
        return this.authDao.getUserByEmail(email);
    }

    // 임시 비밀번호 생성 (8자리 영문 + 숫자)
    public String generateTempPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder tempPw = new StringBuilder();
        Random random = new Random();

        for (int i = 0; i < 8; i++) {
            tempPw.append(chars.charAt(random.nextInt(chars.length())));
        }

        return tempPw.toString();
    }

    // 비밀번호 찾기
    public void resetPw(String email) {
        // 이메일로 회원 조회
        User user = this.authDao.getUserByEmail(email);
        if (user == null) {
            throw new IllegalArgumentException("등록되지 않은 이메일입니다.");
        }

        // 8자리 임시 비밀번호 생성
        String tempPw = generateTempPassword();

        // BCrypt로 암호화
        String encodedPw = this.passwordEncoder.encode(tempPw);

        // DB에 암호화된 임시 비밀번호로 업데이트
        this.authDao.updatePw(user.getId(), encodedPw);

        // 평문 임시 비밀번호를 이메일로 발송
        this.emailService.sendTempPw(email, tempPw);
    }

    // 소셜아이디로 조회
    public User findBySocialId(String socialId, int loginType) {
        return this.authDao.findBySocialId(socialId, loginType);
    }
}

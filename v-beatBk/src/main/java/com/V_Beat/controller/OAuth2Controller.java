package com.V_Beat.controller;

import java.util.Map;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.V_Beat.dto.User;
import com.V_Beat.dto.Req;
import com.V_Beat.service.GitHubOAuthService;
import com.V_Beat.service.GoogleOAuthService;
import com.V_Beat.service.KakaoOAuthService;
import com.V_Beat.service.MemberService;
import com.V_Beat.util.Util;


@Controller
public class OAuth2Controller {

    private final KakaoOAuthService kakaoOAuthService;
    private final GitHubOAuthService gitHubOAuthService;
    private final GoogleOAuthService googleOAuthService;
    private final MemberService memberService;
    private final Req req;

    public OAuth2Controller(KakaoOAuthService kakaoOAuthService, GitHubOAuthService gitHubOAuthService, GoogleOAuthService googleOAuthService, MemberService memberService, Req req) {
        this.kakaoOAuthService = kakaoOAuthService;
        this.gitHubOAuthService = gitHubOAuthService;
        this.googleOAuthService = googleOAuthService;
        this.memberService = memberService;
        this.req = req;
    }

    // 카카오 로그인 시작
    @GetMapping("/oauth/kakao")
    public String kakaoLogin() {
        String loginUrl = kakaoOAuthService.getKakaoLoginUrl();
        return "redirect:" + loginUrl;
    }

    // 카카오 콜백 처리
    @GetMapping("/oauth/kakao/callback")
    @ResponseBody
    public String kakaoCallback(@RequestParam String code) {
        try {
            // 1. 액세스 토큰 받기
            String accessToken = kakaoOAuthService.getAccessToken(code);

            // 2. 사용자 정보 가져오기
            Map<String, Object> userInfo = kakaoOAuthService.getUserInfo(accessToken);

            String socialId = (String) userInfo.get("id");
            String email = (String) userInfo.get("email");
            String nickname = (String) userInfo.get("nickname");
            String profileImg = (String) userInfo.get("profileImg");
            
            // 3. DB에서 카카오 계정 찾기
            User member = memberService.findBySocialId(socialId, 1); // loginType=1(카카오)

            if (member == null) {
                // 신규 회원 - 회원가입
                User newMember = new User();
                newMember.setEmail(email);
                newMember.setNickName(nickname);
                newMember.setLoginType(1); // 카카오
                newMember.setSocialId(socialId);
                newMember.setLoginPw(null); // 소셜 로그인은 비밀번호 없음
                newMember.setProfileImg(profileImg); 
                
                memberService.joinSocial(newMember);
                
                // ⭐ 중요: DB에 저장 후 다시 조회 (id 포함된 member 가져오기)
                member = memberService.findBySocialId(socialId, 1);
            }

            // 4. 로그인 처리
            req.login(member);

            return Util.jsReplace(nickname + "님 환영합니다!", "/");

        } catch (Exception e) {
            e.printStackTrace();
            return Util.jsReplace("카카오 로그인 실패", "/user/member/login");
        }
    }
    
    // 깃헙 로그인 시작
    @GetMapping("/oauth/github")
    public String githubLogin() {
        try {
            String loginUrl = gitHubOAuthService.getGitHubLoginUrl();
            System.out.println("깃헙 로그인 URL: " + loginUrl);
            return "redirect:" + loginUrl;
        } catch (Exception e) {
            e.printStackTrace();
            return "에러: " + e.getMessage();
        }
    }
    // 깃헙 콜백 처리
    @GetMapping("/oauth/github/callback")
    @ResponseBody
    public String githubCallback(@RequestParam String code) {
        try {
            // 1. 액세스 토큰 받기
            String accessToken = gitHubOAuthService.getAccessToken(code);

            // 2. 사용자 정보 가져오기
            Map<String, Object> userInfo = gitHubOAuthService.getUserInfo(accessToken);

            String socialId = (String) userInfo.get("id");
            String email = (String) userInfo.get("email");
            String nickname = (String) userInfo.get("nickname");
            String profileImg = (String) userInfo.get("profileImg");
            
            // 3. DB에서 깃헙 계정 찾기
            User member = memberService.findBySocialId(socialId, 2); // loginType=2(깃헙)

            if (member == null) {
                // 신규 회원 - 회원가입
                User newMember = new User();
                newMember.setEmail(email);
                newMember.setNickName(nickname);
                newMember.setLoginType(2); // 깃헙
                newMember.setSocialId(socialId);
                newMember.setLoginPw(null); // 소셜 로그인은 비밀번호 없음
                newMember.setProfileImg(profileImg); 
                
                memberService.joinSocial(newMember);
                
                // ⭐ 중요: DB에 저장 후 다시 조회 (id 포함된 member 가져오기)
                member = memberService.findBySocialId(socialId, 2);
            }

            // 4. 로그인 처리
            req.login(member);

            return Util.jsReplace(nickname + "님 환영합니다!", "/");

        } catch (Exception e) {
            e.printStackTrace();
            return Util.jsReplace("깃헙 로그인 실패", "/user/member/login");
        }
    }

 // 구글 로그인 시작
    @GetMapping("/oauth/google")
    public String googleLogin() {
        return "redirect:" + googleOAuthService.getGoogleLoginUrl();
    }

    // 구글 콜백 처리
    @GetMapping("/oauth/google/callback")
    @ResponseBody
    public String googleCallback(@RequestParam String code) {
        try {
            // 1. 액세스 토큰 받기
            String accessToken = googleOAuthService.getAccessToken(code);

            // 2. 사용자 정보 가져오기
            Map<String, Object> userInfo = googleOAuthService.getUserInfo(accessToken);

            String socialId = (String) userInfo.get("id");
            String email = (String) userInfo.get("email");
            String nickname = (String) userInfo.get("nickname");
            String profileImg = (String) userInfo.get("profileImg");
            
            // 3. DB에서 구글 계정 찾기
            User member = memberService.findBySocialId(socialId, 3); // loginType=3(구글)

            if (member == null) {
                // 신규 회원 - 회원가입
                User newMember = new User();
                newMember.setEmail(email);
                newMember.setNickName(nickname);
                newMember.setLoginType(3); // 구글
                newMember.setSocialId(socialId);
                newMember.setLoginPw(null);
                newMember.setProfileImg(profileImg); 
                
                memberService.joinSocial(newMember);
                member = memberService.findBySocialId(socialId, 3);
            }

            // 4. 로그인 처리
            req.login(member);

            return Util.jsReplace(nickname + "님 환영합니다!", "/");

        } catch (Exception e) {
            e.printStackTrace();
            return Util.jsReplace("구글 로그인 실패", "/user/member/login");
        }
    }
    
}
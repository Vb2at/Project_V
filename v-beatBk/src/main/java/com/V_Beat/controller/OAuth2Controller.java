package com.V_Beat.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.V_Beat.dto.User;
import com.V_Beat.service.AuthService;
import com.V_Beat.service.GoogleOAuthService;
import com.V_Beat.service.KakaoOAuthService;
import com.V_Beat.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
public class OAuth2Controller {

    private final KakaoOAuthService kakaoOAuthService;
    private final GoogleOAuthService googleOAuthService;
    private final AuthService authService;
    private final UserService userService;

    // ✅ 프론트 주소 (환경별로 바뀌니 yml로 빼는 게 좋음)
    @Value("${app.front-base-url:http://localhost:5173}")
    private String frontBaseUrl;

    public OAuth2Controller(
            KakaoOAuthService kakaoOAuthService,
            GoogleOAuthService googleOAuthService,
            AuthService authService,
            UserService userService
    ) {
        this.kakaoOAuthService = kakaoOAuthService;
        this.googleOAuthService = googleOAuthService;
        this.authService = authService;
        this.userService = userService;
    }

    // -------------------------
    // 공통: 로그인 성공 처리
    // -------------------------
    private String onLoginSuccess(User user, HttpSession session) {
        session.setAttribute("loginUser", user);
        session.setAttribute("loginUserNickName", user.getNickName());
        session.setAttribute("loginUserId", user.getId());
        session.setAttribute("loginUserRole", user.getRole());

        // ✅ 프론트로 리다이렉트 (React 라우터에서 처리)
        // 예: /oauth/success 같은 페이지 만들어서 toast 띄우고 /main 이동 등
        return "redirect:" + frontBaseUrl + "/nav-loading?target=/main";
    }

    private String onLoginFail(String message) {
        String msg = URLEncoder.encode(message, StandardCharsets.UTF_8);
        // 프론트 /login 페이지에서 쿼리 읽어서 toast/alert 처리
        return "redirect:" + frontBaseUrl + "/login?error=" + msg;
    }

    // Kakao
    @GetMapping("/oauth/kakao")
    public String kakaoLogin() {
        return "redirect:" + kakaoOAuthService.getKakaoLoginUrl();
    }

    @GetMapping("/oauth/kakao/callback")
    public String kakaoCallback(@RequestParam(required=false) String code, @RequestParam(required=false) String error, HttpSession session) {
    	if(error != null) {
    		return onLoginFail("카카오 로그인 취소");
    	}
    	
    	if(code == null) {
    		return onLoginFail("카카오 로그인 코드 없음");
    	}
    	
        try {
            String accessToken = kakaoOAuthService.getAccessToken(code);
            Map<String, Object> userInfo = kakaoOAuthService.getUserInfo(accessToken);

            String socialId = String.valueOf(userInfo.get("id"));
            String email = (String) userInfo.get("email");
            String nickname = (String) userInfo.get("nickname");
            String profileImg = (String) userInfo.get("profileImg");

            if(email == null || email.isBlank()) email = "kakao_" + socialId + "@local";
            if(nickname == null || nickname.isBlank()) nickname = "kakao_" + socialId;

            User user = authService.findBySocialId(socialId, 1);
            

            if(user == null) {
                User newMember = new User();
                newMember.setEmail(email);
                newMember.setNickName(nickname);
                newMember.setLoginType(1);
                newMember.setSocialId(socialId);
                newMember.setLoginPw(null);
                newMember.setProfileImg(profileImg);
                newMember.setRole("USER");

                authService.joinSocial(newMember);
                user = authService.findBySocialId(socialId, 1);
            }

            return onLoginSuccess(user, session);

        } catch (Exception e) {
            e.printStackTrace();
            return onLoginFail("카카오 로그인 실패");
        }
    }

    // Google
    @GetMapping("/oauth/google")
    public String googleLogin() {
        return "redirect:" + googleOAuthService.getGoogleLoginUrl();
    }

    @GetMapping("/oauth/google/callback")
    public String googleCallback(@RequestParam(required=false) String code, @RequestParam(required=false) String error, HttpSession session) {
    	if(error != null) {
    		return onLoginFail("구글 로그인 취소");
    	}
    	
    	if(code == null) {
    		return onLoginFail("구글 로그인 코드 없음");
    	}
    	
        try {
            String accessToken = googleOAuthService.getAccessToken(code);
            Map<String, Object> userInfo = googleOAuthService.getUserInfo(accessToken);

            String socialId = String.valueOf(userInfo.get("id"));
            String email = (String) userInfo.get("email");
            String nickname = (String) userInfo.get("nickname");
            String profileImg = (String) userInfo.get("profileImg");

            if(email == null || email.isBlank()) email = "google_" + socialId + "@local";
            if(nickname == null || nickname.isBlank()) nickname = "google_" + socialId;
            
            User user = authService.findBySocialId(socialId, 2);

            if(user == null) {
                User newMember = new User();
                newMember.setEmail(email);
                newMember.setNickName(nickname);
                newMember.setLoginType(2);
                newMember.setSocialId(socialId);
                newMember.setLoginPw(null);
                newMember.setProfileImg(profileImg);
                newMember.setRole("USER");

                authService.joinSocial(newMember);
                user = authService.findBySocialId(socialId, 2);
            }

            return onLoginSuccess(user, session);

        } catch (Exception e) {
            e.printStackTrace();
            return onLoginFail("구글 로그인 실패");
        }
    }
}

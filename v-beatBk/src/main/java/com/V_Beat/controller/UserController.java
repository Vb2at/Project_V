package com.V_Beat.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dto.CheckReq;
import com.V_Beat.dto.User;
import com.V_Beat.service.UserService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 닉네임 변경
    @PostMapping("/change-nickname")
    public Map<String, Object> changeNickName(@RequestBody CheckReq req, HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        String nickName = (req.getNickName() == null) ? "" : req.getNickName().trim();
        if (nickName.isEmpty()) {
            res.put("ok", false);
            res.put("message", "닉네임을 입력하세요.");
            return res;
        }

        String result = this.userService.changeNickName(loginUserId, nickName);
        if ("success".equals(result)) {
            // ✅ 세션 값도 최신화
            session.setAttribute("loginUserNickName", nickName);

            // ✅ 추가: loginUser 객체도 갱신(세션 일관성)
            Object obj = session.getAttribute("loginUser");
            if (obj instanceof User u) {
                u.setNickName(nickName);
                session.setAttribute("loginUser", u);
            }

            res.put("ok", true);
            res.put("message", "닉네임이 변경되었습니다.");
            return res;
        }

        res.put("ok", false);
        res.put("message", result);
        return res;
    }

    // 비밀번호 변경
    @PostMapping("/change-pw")
    public Map<String, Object> changePw(@RequestBody CheckReq req, HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        String currentPw = (req.getCurrentPw() == null) ? "" : req.getCurrentPw().trim();
        String newPw = (req.getLoginPw() == null) ? "" : req.getLoginPw().trim();

        if (newPw.isEmpty() || currentPw.isEmpty()) {
            res.put("ok", false);
            res.put("message", "비밀번호를 입력하세요");
            return res;
        }

        String result = userService.changePw(loginUserId, currentPw, newPw);

        if ("success".equals(result)) {
            res.put("ok", true);
            res.put("message", "비밀번호가 변경되었습니다.");
            return res;
        }

        res.put("ok", false);
        res.put("message", result);
        return res;
    }

    // 프로필 이미지 업로드
    @PostMapping(value = "/uploadProfile", consumes = "multipart/form-data")
    public Map<String, Object> uploadProfile(@RequestParam("profileImg") MultipartFile profileImg,
                                             HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        if (profileImg == null || profileImg.isEmpty()) {
            res.put("ok", false);
            res.put("message", "업로드할 파일을 선택하세요.");
            return res;
        }

        String result = userService.uploadProfile(loginUserId, profileImg);

        if (result == null || !result.startsWith("profileImg/")) {
            res.put("ok", false);
            res.put("message", result == null ? "프로필 이미지 업로드에 실패했습니다." : result);
            return res;
        }

        res.put("ok", true);
        res.put("message", "프로필 이미지가 업로드 되었습니다.");
        res.put("fileName", result);
        return res;
    }

    // 회원탈퇴
    @PostMapping("/deleteAccount")
    public Map<String, Object> deleteAccount(HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        String result = this.userService.deleteAccount(loginUserId);
        if ("success".equals(result)) {
            session.invalidate();
            res.put("ok", true);
            res.put("message", "회원탈퇴가 정상적으로 되었습니다.");
            return res;
        } else {
            res.put("ok", false);
            res.put("message", result);
        }

        return res;
    }

    // 유저 정보 조회
    @GetMapping("/myInfo")
    public Map<String, Object> selectInfo(HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        User user = this.userService.selectById(loginUserId);
        if (user == null) {
            res.put("ok", false);
            res.put("message", "조회되는 정보가 없습니다.");
            return res;
        }

        res.put("ok", true);
        res.put("user", user);
        return res;
    }
}

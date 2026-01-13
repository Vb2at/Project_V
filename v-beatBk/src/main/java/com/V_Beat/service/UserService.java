package com.V_Beat.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dao.UserDao;

@Service
public class UserService {
	
	private UserDao userDao;
	private PasswordEncoder passwordEncoder;
	
	public UserService(UserDao userDao, PasswordEncoder passwordEncoder) {
		this.userDao = userDao;
		this.passwordEncoder = passwordEncoder;
	}
	
	//닉네임 변경
    public String changeNickName(Integer loginUserId, String nickName) {
        int updated = this.userDao.changeNickName(loginUserId, nickName);

        if (updated == 1) {
            return "success";
        }
        return "닉네임 변경에 실패했습니다.";
    }

    //비밀번호 변경
	public String changePw(Integer loginUserId, String newPw) {
		String encodedPw = this.passwordEncoder.encode(newPw);
		int updated = this.userDao.changePw(loginUserId, encodedPw);
		
		if(updated == 1) {
			return "success";
		}
		return "비밀번호 변경에 실패했습니다.";
	}

	//프로필 이미지 업로드
	public String uploadProfile(Integer loginUserId, MultipartFile profileImg) {
	    if (profileImg == null || profileImg.isEmpty()) {
	        return "업로드할 파일이 없습니다.";
	    }

	    try {
	    	//경로 변경하기
	        Path dir = Paths.get("D:/VBeat/profileImg");
	        Files.createDirectories(dir);

	        String original = profileImg.getOriginalFilename();
	        String safeOriginal = (original == null) ? "profile.png" : original;
	        String fileName = UUID.randomUUID() + "_" + safeOriginal;

	        Path savePath = dir.resolve(fileName);

	        Files.copy(profileImg.getInputStream(), savePath, StandardCopyOption.REPLACE_EXISTING);

	        int updated = userDao.uploadProfile(loginUserId, fileName);
	        if (updated != 1) return "프로필 DB 저장에 실패했습니다.";

	        return fileName;

	    } catch (IOException e) {
	        return "프로필 이미지 저장에 실패했습니다.";
	    }
	}
	
	//회원탈퇴
	public String deleteAccount(Integer loginUserId) {
		int deleted = this.userDao.deleteAccount(loginUserId);
		if(deleted == 1) {
			return "success";
		}
		return "회원탈퇴에 실패했습니다.";
	}
}

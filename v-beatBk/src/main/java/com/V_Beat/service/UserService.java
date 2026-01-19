package com.V_Beat.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dao.ScoreDao;
import com.V_Beat.dao.UserDao;
import com.V_Beat.dto.User;

@Service
public class UserService {
	
	private UserDao userDao;
	private ScoreDao scoreDao;
	private PasswordEncoder passwordEncoder;
	
	public UserService(UserDao userDao, ScoreDao scoreDao, PasswordEncoder passwordEncoder) {
		this.userDao = userDao;
		this.scoreDao = scoreDao;
		this.passwordEncoder = passwordEncoder;
	}
	
	//닉네임 변경
    public String changeNickName(Integer loginUserId, String nickName) {
    	//중복 체크 (본인 제외)
    	int cnt = this.userDao.countByNickName(nickName, loginUserId);
    	if(cnt > 0) {
    		return "이미 사용 중인 닉네임입니다.";
    	}
    	
    	//변경 없음 (본인 닉네임)
    	String nick = this.userDao.findNickNameById(loginUserId);
    	if(nick != null && nick.equals(nickName)) {
    		return "현재 사용 중인 닉네입입니다..";
    	}
    	//새 닉네임으로 업데이트
        int updated = this.userDao.changeNickName(loginUserId, nickName);
        if (updated == 1) {
            return "success";
        }
        return "닉네임 변경에 실패했습니다.";
    }

    //비밀번호 변경
	public String changePw(Integer loginUserId, String currentPw, String newPw) {
	    String encodedPw = userDao.selectPwById(loginUserId); 
	    if (encodedPw == null) return "사용자 정보를 찾을 수 없습니다.";

	    if (!passwordEncoder.matches(currentPw, encodedPw)) {
	        return "현재 비밀번호가 올바르지 않습니다.";
	    }

	    String newEncoded = passwordEncoder.encode(newPw);
	    //새로운 비밀번호 저장
	    int updated = userDao.changePw(loginUserId, newEncoded); 

	    if (updated == 1) return "success";
	    return "비밀번호 변경에 실패했습니다.";
	}

	//프로필 이미지 업로드
	public String uploadProfile(Integer loginUserId, MultipartFile profileImg) {
	    if (profileImg == null || profileImg.isEmpty()) {
	        return "업로드할 파일이 없습니다.";
	    }

	    try {
	    	//경로 변경하기
	    	Path dir = Paths.get("upload", "profileImg");
	        Files.createDirectories(dir);

	        String original = profileImg.getOriginalFilename();
	        String safeOriginal = (original == null) ? "profile.png" : original.replaceAll("[\\\\/]", "_");
	        String fileName = UUID.randomUUID() + "_" + safeOriginal;

	        Path savePath = dir.resolve(fileName);

	        System.out.println("PROFILE SAVE PATH = " + savePath.toAbsolutePath());

	        Files.copy(profileImg.getInputStream(), savePath, StandardCopyOption.REPLACE_EXISTING);

	        //상대경로 저장
	        String dbPath = "profileImg/" + fileName;
	        
	        int updated = userDao.uploadProfile(loginUserId, dbPath);
	        if (updated != 1) return "프로필 DB 저장에 실패했습니다.";
	        
	        //프론트에서 /upload/ + dbPath 로 사용 가능
	        return dbPath;

	    } catch (IOException e) {
	        return "프로필 이미지 저장에 실패했습니다.";
	    }
	}
	
	//회원탈퇴
	@Transactional
	public String deleteAccount(Integer loginUserId) {
		//점수 기록 삭제
		this.scoreDao.deleteByUserId(loginUserId);
		
		//유저 삭제
		int deleted = this.userDao.deleteAccount(loginUserId);
		if(deleted == 1) {
			return "success";
		}
		return "회원탈퇴에 실패했습니다.";
	}
	
    public User findById(int id) {
        return userDao.findById(id);
    }

    //유저 정보 조회
	public User selectById(Integer loginUserId) {
		return this.userDao.selectById(loginUserId);
	}
}

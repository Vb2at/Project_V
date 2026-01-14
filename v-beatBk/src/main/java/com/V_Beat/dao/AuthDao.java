package com.V_Beat.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.dto.User;

@Mapper
public interface AuthDao {
	
	//이메일 중복 검증
	@Select("""
			SELECT COUNT(*) > 0
				FROM `user`
				WHERE email = #{email}
			""")
	boolean existsByEmail(String email);
	
	//닉네임 중복 검증
	@Select("""
			SELECT COUNT(*) > 0
				FROM `user`
				WHERE nickName = #{nickName} 
			""")
	boolean existsByNickName(String nickName);
	
	//회원가입
	@Insert("""
			INSERT INTO `user`
				SET email = #{email},
					nickName = #{nickName},
					loginPw = #{loginPw},
					loginType = #{loginType},
					regDate = NOW()
			""")
	void join(User user);
	
	//소셜로 가입 (kakao, goole) 비번 null 허용
	@Insert("""
			INSERT INTO `user`
				SET email = #{email},
					nickName = #{nickName},
					loginType = #{loginType},
					socialId = #{socialId},
					profileImg = #{profileImg},
					regDate = NOW()
			""")
	void joinBySocialId(User user);
	
	//소셜 아이디로 유저 조회
	@Select("""
			SELECT * 
				FROM `user`
				WHERE socialId = #{socialId}
				AND loginType= #{loginType}
			""")
	User findBySocialId(@Param("socialId") String socialId, @Param("loginType") int loginType);
	
	//로그인 이메일 확인
	@Select("""
			SELECT *
				FROM `user`
				WHERE email = #{email}
			""")
	User getUserByEmail(String email);
	
	//비밀번호 업데이트
	@Update("""
			UPDATE `user`
				SET loginPw = #{encodedPw}
				WHERE id = #{id}
			""")
	void updatePw(@Param("id") int id, @Param("encodedPw") String encodedPw);

}

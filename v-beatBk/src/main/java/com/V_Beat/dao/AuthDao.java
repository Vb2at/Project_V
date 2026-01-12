package com.V_Beat.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
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
				SET loginPw = #{loginPw}
				WHERE id = #{id}
			""")
	void updatePw(int id, String endoedPw);

}

package com.V_Beat.dao;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.dto.User;


@Mapper
public interface MemberDao{
	
	@Insert("""
		    INSERT INTO `User` (email, loginPw, nickName, loginType, socialId, profileImg, regDate)
		    VALUES (#{email}, #{loginPw}, #{nickName}, #{loginType}, #{socialId}, #{profileImg}, NOW())
		    """)
		void join(User member);

	@Select("""
			SELECT * FROM `User` 
			WHERE id = #{id}
			""")
	User findById(int id);	
	
	@Select("""
			SELECT * FROM `user`
			     WHERE nickName = #{nickName}
			""")
	User findByNickName(String nickName);

	@Select("""
		    SELECT * FROM `user`
		    	WHERE email = #{email}
		    """)
	User findByEmail(String email);

	@Update("""
		    UPDATE `user`
		    	SET loginPw = #{loginPw}
		    	WHERE id = #{id}
		    """)
	void updatePw(int id, String loginPw);

	@Select("""
			SELECT id, nickName, email
				FROM User
				WHERE email = #{keyword} OR nickName = #{keyword}
				LIMIT 1
			""")
	User searchUser(String keyword);
		
	@Select("""
			SELECT COUNT(*) 
				FROM TeamMember 
				WHERE teamId = #{teamId} AND userId = #{userId}
			    """)
	int checkMember(int teamId, int userId);

	@Update("""
			UPDATE `User`
				SET nickName = #{nickName}
			    WHERE id = #{id}
			""")
	void updateNickName(int id, String nickName);
	
	
	@Update("""
		    UPDATE `User`
		        SET loginPw = #{loginPw}
		        WHERE id = #{id}
		    """)
		void updatePassword(int id, String loginPw);
	
	@Update("""
		    UPDATE `User`
		        SET profileImg = #{profileImg}
		        WHERE id = #{id}
		    """)
		void updateProfileImg(int id, String profileImg);

	@Select("""
		    SELECT COUNT(*) > 0 
		        FROM Team 
		        WHERE leader = #{userId}
		    """)
		boolean checkLeader(int userId);

	@Delete("""
			DELETE FROM User
			WHERE id = #{userId}
			""")
		void deleteAccount(int userId);

	@Select("""
		    SELECT * FROM `User`
		    WHERE socialId = #{socialId} AND loginType = #{loginType}
		    """)
		User findBySocialId(String socialId, int loginType);
	
	
}
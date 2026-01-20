package com.V_Beat.dao;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dto.User;

@Mapper
public interface UserDao {
	//닉네임 변경
    @Update("""
        UPDATE `user`
           SET nickName = #{nickName}
    	   WHERE id = #{loginUserId}
    """)
    int changeNickName(@Param("loginUserId") Integer loginUserId,
                       @Param("nickName") String nickName);

    //비밀번호 변경
    @Update("""
        UPDATE `user`
           SET login_pw = #{encodedPw}
           WHERE id = #{loginUserId}
    """)
    int changePw(@Param("loginUserId") Integer loginUserId,
                 @Param("encodedPw") String encodedPw);

    //프로필 이미지 업로드
    @Update("""
    	    UPDATE `user`
    	       SET profile_img = #{profileImg}
    	       WHERE id = #{loginUserId}
    	""")
    int uploadProfile(@Param("loginUserId") Integer loginUserId,
    	              @Param("profileImg") String profileImg);
    
    //회원탈퇴
    @Delete("""
    		DELETE FROM `user`
    			WHERE id = #{loginUserId}
    		""")
	int deleteAccount(@Param("loginUserId") Integer loginUserId);
    
    //유저 단건 조회
    @Select("""
        SELECT id,
               email,
               nickName,
               profile_img AS profileImg,
               login_type AS loginType,
               social_id AS socialId,
               reg_date AS regDate,
               `role`
          FROM `user`
         WHERE id = #{id}
    """)
    User findById(@Param("id") int id);
    
    //유저 정보 조회
    @Select("""
    		SELECT email, reg_date AS regDate, login_type AS loginType, `role`
    			FROM `user`
    			WHERE id = #{loginUserId}
    		""")
	User selectById(Integer loginUserId);
    
    @Select("""
    		SELECT login_pw as loginPw 
    			FROM `user`
    			WHERE id = #{loginUserId}
    		""")
	String selectPwById(@Param("loginUserId") Integer loginUserId);

    //닉네임 중복 체크
    @Select("""
    		SELECT COUNT(*)
    			FROM `user`
    			WHERE nickName = #{nickName}
    			AND id <> #{loginUserId}
    		""")
	int countByNickName(@Param("nickName") String nickName, @Param("loginUserId") Integer loginUserId);
    
    //닉네임 중복 체크 (본인 닉네임)
    @Select("""
    		SELECT nickName
    			FROM `user`
    			WHERE id = #{loginUserId}
    		""")
	String findNickNameById(Integer loginUserId);
}
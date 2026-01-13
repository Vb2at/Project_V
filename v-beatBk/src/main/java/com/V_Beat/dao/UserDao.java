package com.V_Beat.dao;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;
import org.springframework.web.multipart.MultipartFile;

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
           SET loginPw = #{encodedPw}
           WHERE id = #{loginUserId}
    """)
    int changePw(@Param("loginUserId") Integer loginUserId,
                 @Param("encodedPw") String encodedPw);

    //프로필 이미지 업로드
    @Update("""
    	    UPDATE `user`
    	       SET profileImg = #{profileImg}
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
}
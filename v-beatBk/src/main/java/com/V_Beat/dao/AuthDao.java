package com.V_Beat.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.dto.User;

@Mapper
public interface AuthDao {

    // 이메일 중복 검증
    @Select("""
        SELECT COUNT(*) > 0
        FROM `user`
        WHERE email = #{email}
    """)
    boolean existsByEmail(String email);

    // 닉네임 중복 검증
    @Select("""
        SELECT COUNT(*) > 0
        FROM `user`
        WHERE nickName = #{nickName}
    """)
    boolean existsByNickName(String nickName);

    // 회원가입
    @Insert("""
        INSERT INTO `user`
        SET email = #{email},
            nickName = #{nickName},
            login_pw = #{loginPw},
            login_type = #{loginType},
            reg_date = NOW()
    """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void join(User user);

    // 소셜로 가입 (kakao, google) 비번 null 허용
    @Insert("""
        INSERT INTO `user`
        SET email = #{email},
            nickName = #{nickName},
            login_type = #{loginType},
            social_id = #{socialId},
            profile_img = #{profileImg},
            reg_date = NOW()
    """)
    void joinBySocialId(User user);

    // 소셜 아이디로 유저 조회
    @Select("""
        SELECT *
        FROM `user`
        WHERE social_id = #{socialId}
          AND login_type = #{loginType}
    """)
    User findBySocialId(@Param("socialId") String socialId,
                        @Param("loginType") int loginType);

    // 로그인 이메일 확인
    @Select("""
        SELECT
          id,
          email,
          login_pw AS loginPw,
          nickName,
          login_type AS loginType,
          social_id AS socialId,
          role
        FROM `user`
        WHERE email = #{email}
    """)
    User getUserByEmail(String email);

    //비밀번호 업데이트
    @Update("""
        UPDATE `user`
        SET login_pw = #{encodedPw}
        WHERE id = #{id}
    """)
    void updatePw(@Param("id") int id,
                  @Param("encodedPw") String encodedPw);
    
    //임시 비번 발급 후 need_pw_change true로 업데이트 -> 로그인 시 비밀번호 변경 요구
    @Update("""
    		UPDATE `user`
    		SET need_pw_change = #{b}
    		WHERE email = #{email}
    		""")
	void updateNeedPwChangeStatus(String email, boolean b);
}

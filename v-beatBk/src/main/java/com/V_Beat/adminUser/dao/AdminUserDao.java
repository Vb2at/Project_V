package com.V_Beat.adminUser.dao;

import java.util.List;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.adminUser.dto.AdminUserList;
import com.V_Beat.dto.User;

@Mapper
public interface AdminUserDao {

	//유저 목록 조회
	@Select("""
			<script>
			SELECT id, nickName, `role`
			FROM `user`
			<where>
				<if test = "keyword != null and keyword != ''">
					AND nickName LIKE CONCAT('%', #{keyword}, '%')
				</if>
				<if test="role != null and role !=''">
					AND `role` = #{role}
				</if>
			</where>
			WHERE `role` != 'ADMIN'
			ORDER BY id DESC
			LIMIT #{s} OFFSET #{offset}
			</script>
			""")
	List<AdminUserList> getUsers(@Param("keyword") String keyword, @Param("role") String role,
								 @Param("s") int s, @Param("offset") int offset);

	//전체 유저 수 조회 (페이징 처리용)
	@Select("""
			<script>
			SELECT COUNT(*)
			FROM `user`
			<where>
				<if test = "keyword != null and keyword != ''">
					AND nickName LIKE CONCAT('%', #{keyword}, '%')
				</if>
				<if test="role != null and role != ''">
					AND `role` = #{role}
				</if>
			</where>
			</script>
			""")
	int countUsers(@Param("keyword") String keyword, @Param("role") String role);
	
	//사용자 조회
	@Select("""
			SELECT id, `role`
			FROM `user`
			WHERE id = #{userId}
			""")
	User findById(int userId);

	//사용자 role 변경
	@Update("""
			UPDATE `user`
			SET `role` = #{role}
			WHERE id = #{userId}
			""")
	void updateUserRole(@Param("userId") int userId, @Param("role") String role);

	//사용자 차단 처리
	@Insert("""
			INSERT INTO report(
					reporter_user_id,
					target_type,
					target_id,
					reason_code,
					`status`,
					reg_date
			)
			VALUES(
				#{adminId},
				'USER',
				#{userId},
				'ADMIN_BLOCK',
				'RESOLVED',
				NOW()
			)
			""")
	void insertAdminBlock(@Param("adminId") int adminId, @Param("userId") int userId);
}
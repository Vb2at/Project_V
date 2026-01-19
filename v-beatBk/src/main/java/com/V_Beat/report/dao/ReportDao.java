package com.V_Beat.report.dao;

import java.util.List;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.report.dto.AdminReportList;
import com.V_Beat.report.dto.Report;

@Mapper
public interface ReportDao {
	
	//신고등록
	@Insert("""
			INSERT INTO report
				 (reporter_user_id, target_type, target_id, reason_code, description, status, reg_date)
			VALUES
			     (#{reporterUserId}, #{targetType}, #{targetId}, #{reasonCode}, #{description}, #{status}, NOW())	
			""")
	@Options(useGeneratedKeys = true, keyProperty = "id")
	void insert(Report report);
	
	//신고 대상 존재 여부 확인
	@Select("""
			SELECT COUNT(*) 
				FROM `user`
				WHERE id = #{targetId}
			""")
	int existsUser(long targetId);

	@Select("""
			SELECT COUNT(*) 
				FROM song
				WHERE id = #{targetId}
			""")
	int existsSong(long targetId);

	@Select("""
			SELECT COUNT(*) 
				FROM comment
				WHERE id = #{targetId}
			""")
	int existsComment(long targetId);
	
	//신고 내역 조회
	@Select("""
		    SELECT COUNT(*)
			      FROM report
			      WHERE reporter_user_id = #{reporterUserId}
			        AND target_type = #{targetType}
			        AND target_id = #{targetId}
			        AND reason_code = #{reasonCode}
			        AND status = 'PENDING'
		""")
	int countPending(long reporterUserId, String targetType, Long targetId, String reasonCode);

	//관리자 신고목록 조회
	@Select("""
			<script>
			SELECT 
				r.id AS reportId,
				r.reporter_user_id AS reporterUserId,
				r.target_type AS targetType,
				r.target_id AS targetId,
				r.reason_code AS reasonCode,
				r.description AS description,
				r.status AS status,
				r.reg_date AS regDate,
				u.nickName as reporterNickName,
				s.id AS snapshotId,
				s.target_name AS targetName,
				s.target_extra AS targetExtra
			FROM report r
			JOIN `user` u
				ON u.id = r.reporter_user_id
			LEFT JOIN report_target_snapshot s
				ON s.report_id = r.id
			<where>
				<if test="status != null and status != ''">
					r.status = #{status}
				</if>
			</where>
			ORDER BY r.id DESC
			</script>
			""")
	List<AdminReportList> getAdminReportList(@Param("status") String status);
	
	
	@Select("""
			SELECT 
				id,
				reporter_user_id AS reporterUserId,
				target_type AS targetType,
				target_id AS targetId,
				reason_code AS reasonCode,
				description,
				status,
				reg_date AS regDate
			FROM report
			WHERE id = #{reportId}
			""")
	Report findById(long reportId);

	//처리 상황 업데이트
	@Update("""
			UPDATE report
				SET status = #{nextStatus}
				WHERE id = #{reportId}
			""")
	void updateStatus(@Param("reportId") long reportId, @Param("nextStatus") String nextStatus);
}
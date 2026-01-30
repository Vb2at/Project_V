// com.V_Beat.report.dao.ReportDao

package com.V_Beat.report.dao;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.report.dto.AdminReportList;
import com.V_Beat.report.dto.Report;
import com.V_Beat.report.dto.ReportTargetSnapshot;

@Mapper
public interface ReportDao {

    // 신고등록
    @Insert("""
            INSERT INTO report
                 (reporter_user_id, target_type, target_id, reason_code, description, status, reg_date)
            VALUES
                 (#{reporterUserId}, #{targetType}, #{targetId}, #{reasonCode}, #{description}, #{status}, NOW())
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(Report report);

    // 신고 대상 존재 여부 확인
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

    // 중복 신고 방지(대상/사유별 PENDING 존재 여부)
    @Select("""
            SELECT COUNT(*)
              FROM report
             WHERE reporter_user_id = #{reporterUserId}
               AND target_type = #{targetType}
               AND target_id = #{targetId}
               AND reason_code = #{reasonCode}
               AND status = 'PENDING'
            """)
    int countPending(
            @Param("reporterUserId") long reporterUserId,
            @Param("targetType") String targetType,
            @Param("targetId") long targetId,
            @Param("reasonCode") String reasonCode
    );

    // ✅ 추가: 관리자 뱃지용 - 전체 PENDING 개수
    @Select("""
            SELECT COUNT(*)
              FROM report
             WHERE status = 'PENDING'
            """)
    int countPendingAll();

    // ✅✅ 추가: 관리자 알림(WS) 보낼 ADMIN 유저 id 목록
    @Select("""
            SELECT id
              FROM `user`
             WHERE role = 'ADMIN'
            """)
    List<Integer> findAdminUserIds();

    // 관리자 신고목록 조회
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

                tu.nickName AS targetName,
                u.nickName AS reporterNickName,

                s.id AS snapshotId,
                s.target_name AS targetName,
                s.target_extra AS targetExtra,

                ra.action_type AS actionType,
                ra.action_reason AS actionReason,
                ra.reg_date AS actionDate

            FROM report r
            JOIN `user` u
              ON u.id = r.reporter_user_id

            LEFT JOIN `user` tu
              ON r.target_type = 'USER'
             AND tu.id = r.target_id

            LEFT JOIN report_target_snapshot s
              ON s.report_id = r.id

            LEFT JOIN report_action ra
              ON ra.id = (
                    SELECT id
                      FROM report_action
                     WHERE report_id = r.id
                     ORDER BY reg_date DESC
                     LIMIT 1
              )

            <where>
              <if test="status != null and status != ''">
                r.status = #{status}
              </if>
            </where>

            ORDER BY r.id DESC
            </script>
            """)
    List<AdminReportList> getAdminReportList(@Param("status") String status);

    // 아이디로 신고 조회
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
    Report findById(@Param("reportId") long reportId);

    // 처리 상황 업데이트
    @Update("""
            UPDATE report
               SET status = #{nextStatus}
             WHERE id = #{reportId}
            """)
    void updateStatus(@Param("reportId") long reportId, @Param("nextStatus") String nextStatus);

    // 음원 업로드한 사용자 조회
    @Select("""
            SELECT user_id
              FROM song
             WHERE id = #{targetId}
            """)
    Integer findSongOwnerId(@Param("targetId") long targetId);

	//사용자 role 판별
	@Select("""
			SELECT `role` FROM `user`
				WHERE id = #{userId}
			""")
	String findUserRole(long userId);
	
	//사용자 role 변경
	@Update("""
			UPDATE `user`
				SET role = #{role}
			WHERE id = #{targetId}
			""")
	void updateUserRole(@Param("targetId") Long targetId, @Param("role") String role);

	//노래 상태 변경
	@Update("""
			UPDATE song
				SET visibility = #{status}
			WHERE id = #{targetId}
			""")
	void updateSongStatus(@Param("targetId") Long targetId, @Param("status") String status);
	
	//해당 곡 관련 기록 삭제(노래 삭제)
	@Delete("""
			DELETE FROM report
			WHERE target_type = 'SONG'
			AND target_id = #{songId}
			""")
	void deleteBySongId(long songId);
	
	//관리자 처리 후 해당 곡 삭제
	@Delete("""
			DELETE FROM song
			WHERE id = #{songId}
			""")
	void deleteSong(Long songId);

	//관리자 처리 후 해당 곡 기록 삭제
	@Delete("""
			DELETE FROM score
			WHERE song_id = #{songId}
			""")
	void deleteSongScore(Long songId);

	//관리자 신고 상세 목록 조회(노래)
	@Select("""
		    SELECT
		        s.id        AS songId,
		        s.title     AS songTitle,
		        u.id        AS ownerId,
		        u.nickname  AS ownerNick
		    FROM song s
		    JOIN user u ON s.user_id = u.id
		    WHERE s.id = #{targetId}
		""")
	Map<String, Object> findSong(Long targetId);
}

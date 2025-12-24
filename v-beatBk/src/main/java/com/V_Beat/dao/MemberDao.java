package com.V_Beat.dao;

import java.util.List;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.dto.Member;


@Mapper
public interface MemberDao{
	
	@Insert("""
		    INSERT INTO `User` (email, loginPw, nickName, loginType, socialId, profileImg, regDate)
		    VALUES (#{email}, #{loginPw}, #{nickName}, #{loginType}, #{socialId}, #{profileImg}, NOW())
		    """)
		void join(Member member);

	@Select("""
			SELECT * FROM `User` 
			WHERE id = #{id}
			""")
	Member findById(int id);	
	
	@Select("""
			SELECT * FROM `user`
			     WHERE nickName = #{nickName}
			""")
	Member findByNickName(String nickName);

	@Select("""
		    SELECT * FROM `user`
		    	WHERE email = #{email}
		    """)
	Member findByEmail(String email);

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
	Member searchUser(String keyword);
		
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
		Member findBySocialId(String socialId, int loginType);
	
	/* =========================
	   친구 기능 (FriendRequest 테이블)
	   - 파라미터: Member 1개만 사용 ( @Param / Map 안 씀 )
	   ========================= */

	// 양방향 관계 확인(요청중/친구 포함)
	@Select("""
	    SELECT id,
	           fromUserId,
	           toUserId,
	           status AS friendStatus,
	           regDate,
	           updateDate
	    FROM FriendRequest
	    WHERE (fromUserId = #{fromUserId} AND toUserId = #{toUserId})
	       OR (fromUserId = #{toUserId} AND toUserId = #{fromUserId})
	    LIMIT 1
	""")
	Member findFriendRelation(Member m);

	// 친구 요청 생성
	@Insert("""
	    INSERT INTO FriendRequest (fromUserId, toUserId, status, regDate, updateDate)
	    VALUES (#{fromUserId}, #{toUserId}, 0, NOW(), NOW())
	""")
	void insertFriendRequest(Member m);

	// 받은 요청 목록 (상대방 = 요청 보낸 사람)
	@Select("""
	    SELECT fr.id AS friendRequestId,
	           fr.fromUserId,
	           fr.toUserId,
	           fr.status AS friendStatus,
	           fr.regDate,
	           u.id AS otherUserId,
	           u.nickName AS otherNickName,
	           u.email AS otherEmail
	    FROM FriendRequest fr
	    JOIN User u ON fr.fromUserId = u.id
	    WHERE fr.toUserId = #{toUserId}
	      AND fr.status = 0
	    ORDER BY fr.id DESC
	""")
	List<Member> findReceivedFriendRequests(Member m);

	// 보낸 요청 목록 (상대방 = 요청 받은 사람)
	@Select("""
	    SELECT fr.id AS friendRequestId,
	           fr.fromUserId,
	           fr.toUserId,
	           fr.status AS friendStatus,
	           fr.regDate,
	           u.id AS otherUserId,
	           u.nickName AS otherNickName,
	           u.email AS otherEmail
	    FROM FriendRequest fr
	    JOIN User u ON fr.toUserId = u.id
	    WHERE fr.fromUserId = #{fromUserId}
	      AND fr.status = 0
	    ORDER BY fr.id DESC
	""")
	List<Member> findSentFriendRequests(Member m);

	// 친구 목록 (양방향 묶어서 "상대방" 정보만 other*로 내려줌)
	@Select("""
	    SELECT fr.id AS friendRequestId,
	           fr.fromUserId,
	           fr.toUserId,
	           fr.status AS friendStatus,
	           fr.regDate,
	           CASE WHEN fr.fromUserId = #{fromUserId} THEN u2.id ELSE u1.id END AS otherUserId,
	           CASE WHEN fr.fromUserId = #{fromUserId} THEN u2.nickName ELSE u1.nickName END AS otherNickName,
	           CASE WHEN fr.fromUserId = #{fromUserId} THEN u2.email ELSE u1.email END AS otherEmail
	    FROM FriendRequest fr
	    JOIN User u1 ON fr.fromUserId = u1.id
	    JOIN User u2 ON fr.toUserId = u2.id
	    WHERE fr.status = 1
	      AND (fr.fromUserId = #{fromUserId} OR fr.toUserId = #{fromUserId})
	    ORDER BY fr.id DESC
	""")
	List<Member> findFriends(Member m);

	// 수락 (받은 사람만 가능: toUserId = 내 id)
	@Update("""
	    UPDATE FriendRequest
	    SET status = 1, updateDate = NOW()
	    WHERE id = #{friendRequestId}
	      AND toUserId = #{toUserId}
	      AND status = 0
	""")
	int acceptFriendRequest(Member m);

	// 거절 (삭제로 처리)
	@Delete("""
	    DELETE FROM FriendRequest
	    WHERE id = #{friendRequestId}
	      AND toUserId = #{toUserId}
	      AND status = 0
	""")
	int rejectFriendRequest(Member m);

	// 취소 (내가 보낸 요청만)
	@Delete("""
	    DELETE FROM FriendRequest
	    WHERE id = #{friendRequestId}
	      AND fromUserId = #{fromUserId}
	      AND status = 0
	""")
	int cancelFriendRequest(Member m);

	// 친구 삭제 (친구 상태에서 양방향 삭제)
	@Delete("""
	    DELETE FROM FriendRequest
	    WHERE status = 1
	      AND ((fromUserId = #{fromUserId} AND toUserId = #{toUserId})
	        OR (fromUserId = #{toUserId} AND toUserId = #{fromUserId}))
	""")
	int deleteFriend(Member m);
	
	@Select("""
		    SELECT fromUserId
		    FROM FriendRequest
		    WHERE id = #{friendRequestId}
		      AND toUserId = #{toUserId}
		      AND status = 0
			  LIMIT 1
		""")
	Integer findRequesterIdByRequest(Member m);

	/* =========================
	   대결 초대 기능 (DuelInvite 테이블)
	   - 파라미터: Member 1개만 사용 ( @Param / Map 안 씀 )
	   ========================= */

	// 대기 초대 중복 체크
	@Select("""
	  SELECT COUNT(*)
	  FROM DuelInvite
	  WHERE fromUserId = #{fromUserId}
	    AND toUserId = #{toUserId}
	    AND status = 0
	""")
	int countPendingDuelInvite(Member m);

	// 초대 생성 (insert 후 duelInviteId에 자동으로 id 채움)
	@Insert("""
	  INSERT INTO DuelInvite (fromUserId, toUserId, status, message, regDate, updateDate)
	  VALUES (#{fromUserId}, #{toUserId}, 0, #{duelMessage}, NOW(), NOW())
	""")
	@Options(useGeneratedKeys = true, keyProperty = "duelInviteId")
	void insertDuelInvite(Member m);

	// 수락/거절 시 초대한 사람(fromUserId) 조회 (대기 상태만)
	@Select("""
	  SELECT fromUserId
	  FROM DuelInvite
	  WHERE id = #{duelInviteId}
	    AND toUserId = #{toUserId}
	    AND status = 0
	  LIMIT 1
	""")
	Integer findDuelInviterId(Member m);

	// 수락 처리 (status=1)
	@Update("""
	  UPDATE DuelInvite
	  SET status = 1, updateDate = NOW()
	  WHERE id = #{duelInviteId}
	    AND toUserId = #{toUserId}
	    AND status = 0
	""")
	int acceptDuelInvite(Member m);

	// 거절 처리 (status=2)
	@Update("""
	  UPDATE DuelInvite
	  SET status = 2, updateDate = NOW()
	  WHERE id = #{duelInviteId}
	    AND toUserId = #{toUserId}
	    AND status = 0
	""")
	int rejectDuelInvite(Member m);

}
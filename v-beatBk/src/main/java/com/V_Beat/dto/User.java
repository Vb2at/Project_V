package com.V_Beat.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class User {
	private int id;
	private String email;
	private String loginPw;
	private int loginType;
	private String socialId;
	private String nickName;
	private String regDate;
	private int role;
	private String profileImg;
	// =========================
	// 친구 기능용 임시 필드 (DB 컬럼 아님)
	// - @Param / Map 없이 MyBatis 파라미터 1개로 처리하려고 추가
	// =========================
	private int fromUserId;
	private int toUserId;
	private int friendRequestId; // FriendRequest.id
	private int friendStatus;    // 0=요청중, 1=친구

	// 조회용(상대방 정보 JOIN 결과)
	private int otherUserId;
	private String otherNickName;
	private String otherEmail;
	
	// =========================
	// 친구 온라인 상태 표시용 (DB 컬럼 아님)
	// =========================
	private boolean online;
	
	// =========================
	// 대결 초대 기능용 임시 필드 (DB 컬럼 아님)
	// - MyBatis 파라미터 1개(Member)만 쓰기 위해 추가
	// =========================
	private int duelInviteId;   // DuelInvite.id (insert 후 생성키 받는 용도)
	private String duelMessage; // DuelInvite.message (초대 메시지)

}

package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * FriendRequest
 * -----------------------------
 * ✔ 친구 요청(FriendRequest 테이블) 매핑 DTO
 * ✔ 친구 목록 조회 결과 VO (Friend 테이블 JOIN 결과)
 *
 * ※ 검색 keyword 등은 DTO에 넣지 않고
 *   Controller/Service 파라미터로만 처리
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class FriendRequest {

    /* =========================
       FriendRequest 테이블 필드
       ========================= */

    private int id;          // FriendRequest PK
    private int fromUserId;  // 요청 보낸 사람
    private int toUserId;    // 요청 받은 사람
    private int status;      // 0:요청, 1:수락, 2:거절
    private String regDate;
    private String updateDate;

    /* =========================
       친구 목록/요청 출력용 필드
       (User JOIN 결과)
       ========================= */

    // 친구/요청 상대방 ID (Friend 테이블 기반 목록에서 사용)
    private int friendId;

    private String nickName;
    private String profileImg;

    // 요청 보낸 사람 정보 (받은 요청 목록)
    private String fromNickName;
    private String fromProfileImg;

    // 요청 받은 사람 정보 (보낸 요청 목록)
    private String toNickName;
    private String toProfileImg;
}

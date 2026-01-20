package com.V_Beat.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestDto {
    private int id;              // FriendRequest.id
    private int fromUserId;
    private int toUserId;
    private int status;          // 0 요청중, 1 친구
    private LocalDateTime regDate;

    // 상대방 정보 내려줄 때 쓰는 필드(받은/보낸 목록용)
    private int otherUserId;
    private String otherNickName;
    private String otherEmail;
    private String otherProfileImg;
}

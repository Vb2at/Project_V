package com.V_Beat.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 친구 관련 WebSocket 이벤트 DTO
 *
 * type:
 * - FRIEND_REQUEST_RECEIVED  : 상대가 나에게 친구 요청 보냄
 * - FRIEND_REQUEST_ACCEPTED  : 내가 보낸 요청이 수락됨
 * - FRIEND_DELETED           : 상대가 나를 친구에서 삭제함
 * - FRIEND_REFRESH           : REST 다시 조회하라는 신호(옵션)
 *
 * data:
 * - 이벤트별로 필요한 최소 정보만 Map으로 전달
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendEvent {

    private String type;                 // 이벤트 종류
    private Map<String, Object> data;    // 이벤트 payload

    /** 간편 생성용 팩토리 메서드 */
    public static FriendEvent of(String type, Map<String, Object> data) {
        return new FriendEvent(type, data);
    }
}

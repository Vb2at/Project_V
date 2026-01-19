package com.V_Beat.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class PrivateMessageDto {
    private int id;

    private int fromUserId;
    private int toUserId;

    private String title;
    private String content;

    private boolean isRead;
    private LocalDateTime readDate;
    private LocalDateTime regDate;

    // ===== 조회용 JOIN 필드 =====
    private String fromNickName;
    private String toNickName;
}

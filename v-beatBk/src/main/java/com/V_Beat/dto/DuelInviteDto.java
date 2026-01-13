package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DuelInviteDto {
    private int id;          // DuelInvite.id
    private int fromUserId;
    private int toUserId;
    private int status;      // 0 대기, 1 수락, 2 거절
    private String message;
}

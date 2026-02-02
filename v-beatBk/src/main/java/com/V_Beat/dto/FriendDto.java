package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendDto {
    private int otherUserId;
    private String otherNickName;
    private String otherEmail;
    private boolean online;
    private String otherProfileImg;
    private String role;
}

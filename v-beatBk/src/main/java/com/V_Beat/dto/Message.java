package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Message {
    private int id;
    private int channelId;
    private Integer userId; 
    private String content;
    private int type;
    private String regDate;
    private String nickName; 
    private String profileImg;
    private boolean filtered;     // 마스킹 여부
    private String filterType;    // "MATGIM" (선택)
}
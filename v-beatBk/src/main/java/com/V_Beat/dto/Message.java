package com.V_Beat.dto;

import lombok.Data;

@Data
public class Message {
    private int id;
    private int channelId;
    private Integer userId; 
    private String content;
    private int type;
    private String regDate;
    private String nickName; 
    private String profileImg;
}
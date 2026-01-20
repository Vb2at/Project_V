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
    private Integer userId;       // FK라 NULL 가능(ON DELETE SET NULL)
    private String content;
    private int type;
    private String regDate;
    // JOIN user 정보
    private String nickName;
    private String profileImg;
    // 필터 메타데이터 (DB 저장/조회)
    private boolean filtered;     // m.filtered
    private String filterType;    // m.filter_type (예: "MATGIM")
}

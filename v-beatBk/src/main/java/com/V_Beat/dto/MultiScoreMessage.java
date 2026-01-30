package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MultiScoreMessage {
    private String roomId;   // ✅ 추가
    private Integer userId;  // 있어도 되고 없어도 됨(서버는 principal 사용)
    private int score;
    private int combo;
    private int maxCombo;
}
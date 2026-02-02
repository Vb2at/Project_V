package com.V_Beat.multi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MultiPlayer {

    private Integer userId;
    private String nickname;
    private String profileImg;
    private boolean ready;

    private int score = 0;
    private int combo = 0;

    // ★ 당신이 실제로 사용하는 생성자 — 이 한 개만 필요
    public MultiPlayer(Integer userId,
                       String nickname,
                       String profileImg,
                       boolean ready) {
        this.userId = userId;
        this.nickname = nickname;
        this.profileImg = profileImg;
        this.ready = ready;
        this.score = 0;
        this.combo = 0;
    }
}

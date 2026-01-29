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
    private boolean ready;
}

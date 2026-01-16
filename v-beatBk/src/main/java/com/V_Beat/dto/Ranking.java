package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Ranking {
	private String nickname;
	private String profileImg;
	private int score;
	private double accuracy;
	private String grade;
	private int maxCombo;
}

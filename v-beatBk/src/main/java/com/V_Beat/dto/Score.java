package com.V_Beat.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Score {
	private Long songId;
	private String diff;
	private int score;
	private Double accuracy;
	private String grade;
	private int maxCombo;
	private LocalDate regDate;
	private String title;
}
package com.V_Beat.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
	private BigDecimal accuracy;
	private String grade;
	private int maxCombo;
	private LocalDateTime regDate;
	private String title;
}
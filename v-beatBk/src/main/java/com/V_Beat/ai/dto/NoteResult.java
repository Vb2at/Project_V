package com.V_Beat.ai.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NoteResult {
	private BigDecimal time;
	private int lane;
	private String type;
	private BigDecimal endTime;
}

package com.V_Beat.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Note {
	private long id;
	private long songId;
	private BigDecimal noteTime;
	private int lane;
}

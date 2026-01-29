package com.V_Beat.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

//내 등록곡 조회 전용 dto
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MySong {
	private long id;
	private String title;
	private String artist;
	private String visibility;
	private String coverPath;
	private String diff;
}
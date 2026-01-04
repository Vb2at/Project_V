package com.V_Beat.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SongInfo {
	private Long id;
	private String title;
	private String artist;
	private String duration;
	private String diff;
	private String coverPath;
}

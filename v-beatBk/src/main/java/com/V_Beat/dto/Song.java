package com.V_Beat.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Song {
	private long id;
	private int userId;
	private String title;
	private String filePath;
	private String diff;
	private String artist;
	private String duration;
	private String coverPath;
	private String visibility; // PRIVATE, UNLISTED, PENDING, PUBLIC, BLOCKED
	private LocalDateTime createDate;
	private String previewPath;
	private String nickname;
	private String profileImg;
	private String shareToken;
}
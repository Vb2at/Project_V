package com.V_Beat.review.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

//심사에 필요한 최소한의 대표 필드만 생성
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminSongDetail {
	private long id;
	private String title;
	private String artist;
	private String visibility;
	private long uploadUserId;
	private String uploadUserNickname;
	private LocalDateTime createDate;
	private String duration;
	private String diff;
	private String coverPath;
}

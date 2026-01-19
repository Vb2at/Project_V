package com.V_Beat.report.dto;
//관리자 신고 목록 조회 응답 DTO

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AdminReportList {
	//report
	private Long reportId;
	private String targetType;
	private Integer reporterUserId;
	private Long targetId;
	private String reasonCode;
	private String description;
	private String status;
	private LocalDateTime regDate;
	
	//reporter(user)
	private String reporterNickName;
	
	//snapshot
	private Long snapshotId;
	private String targetName;
	private String targetExtra; //JSON 문자열
}

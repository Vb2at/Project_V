package com.V_Beat.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

//신고 요청 DTO

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateReportReq {
	private String targetType;  // "USER", "SONG", "COMMENT"
	private Long targetId;
	private String reasonCode;
	private String description;
}

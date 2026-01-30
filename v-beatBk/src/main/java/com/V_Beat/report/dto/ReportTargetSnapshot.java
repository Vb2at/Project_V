package com.V_Beat.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportTargetSnapshot {
	private Long reportId;
	private String targetName;
	private String targetExtra;	//JSON 문자열
	private String targetType; 
}

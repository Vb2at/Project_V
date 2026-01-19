package com.V_Beat.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AdminReportActionReq {
	private String actionType;	// WARN, BLOCK, DELETE_CONTENT, IGNORE
	private String actionReason;	//처리 사유
}
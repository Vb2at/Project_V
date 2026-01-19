package com.V_Beat.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReportAction {
	private	Long Id;
	private Long reportId;
	private int adminId;
	private String actionType;
	private String actionReason;
}

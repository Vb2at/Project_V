package com.V_Beat.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Report {
	private String targetType;	// "USER", "SONG", "COMMENT"
	private Long targetId;
	private String reasonCode;
	private String description;
	private Long reporterUserId;
	private String status;	//'PENDING', 'RESOLVED', 'REJECTED'
	private Long id;
}

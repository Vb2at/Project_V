package com.V_Beat.report.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.report.dto.CreateReportReq;
import com.V_Beat.report.service.ReportService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/report")
public class ReportController {
	
	private ReportService reportService;
	
	public ReportController(ReportService reportService) {
		this.reportService = reportService;
	}
	
	//신고 접수 (유저 -> 시스템)
	@PostMapping
	public ResponseEntity<Map<String, Object>> create(@RequestBody CreateReportReq req, HttpSession session) {
	    Map<String, Object> res = new HashMap<>();

	    // 간단한 검증
	    Integer loginUserId = (Integer) session.getAttribute("loginUserId");
	    if (loginUserId == null) {
	        res.put("ok", false);
	        res.put("message", "로그인이 필요한 기능입니다.");
	        return ResponseEntity.status(401).body(res);
	    }

	    if (req.getTargetType() == null || req.getTargetId() == null || req.getReasonCode() == null) {
	        res.put("ok", false);
	        res.put("message", "필수 값이 누락되었습니다.");
	        return ResponseEntity.badRequest().body(res);
	    }

	    try {
	        Long reportId = this.reportService.createReport(loginUserId.longValue(), req);
	        res.put("ok", true);
	        res.put("reportId", reportId);
	        return ResponseEntity.ok(res);

	    } catch (IllegalStateException e) {
	        // 중복 신고는 409 Conflict
	        res.put("ok", false);
	        res.put("code", "ALREADY_REPORTED");
	        res.put("message", e.getMessage()); // "이미 접수된 신고입니다."
	        return ResponseEntity.status(409).body(res);
	    }
	}

}

// com.V_Beat.report.controller.AdminReportController

package com.V_Beat.report.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.V_Beat.report.dto.AdminReportActionReq;
import com.V_Beat.report.dto.AdminReportList;
import com.V_Beat.report.service.ReportService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/admin/report")
public class AdminReportController {

    private final ReportService reportService;

    public AdminReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    // 관리자 신고 목록 조회 (관리자 -> 시스템)
    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String status, HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        // 관리자만 접근 가능하도록
        Object roleObj = session.getAttribute("loginUserRole");
        if (roleObj != null) {
            String role = String.valueOf(roleObj);
            if (!"ADMIN".equals(role)) {
                res.put("ok", false);
                res.put("message", "관리자만 접근 가능한 기능입니다.");
                return res;
            }
        }

        List<AdminReportList> list = this.reportService.getAdminReportList(status);
        res.put("ok", true);
        res.put("reports", list);
        res.put("count", list.size());
        return res;
    }

    // ✅ 추가: 관리자 뱃지용 - PENDING 신고 개수
    @GetMapping("/pending-count")
    public Map<String, Object> pendingCount(HttpSession session) {
        Map<String, Object> res = new HashMap<>();

        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        Object roleObj = session.getAttribute("loginUserRole");
        String role = (roleObj == null) ? "" : String.valueOf(roleObj);
        if (!"ADMIN".equals(role)) {
            res.put("ok", false);
            res.put("message", "관리자만 접근 가능한 기능입니다.");
            return res;
        }

        int count = reportService.getPendingReportCount();
        res.put("ok", true);
        res.put("count", count);
        return res;
    }

    // 관리자 신고 처리
    @PostMapping("/{id}/action")
    public Map<String, Object> action(
            @PathVariable("id") long reportId,
            @RequestBody AdminReportActionReq req,
            HttpSession session
    ) {
        Map<String, Object> res = new HashMap<>();

        // 검증
        Integer loginUserId = (Integer) session.getAttribute("loginUserId");
        if (loginUserId == null) {
            res.put("ok", false);
            res.put("message", "로그인이 필요한 기능입니다.");
            return res;
        }

        Object roleObj = session.getAttribute("loginUserRole");
        String role = (roleObj == null) ? "" : String.valueOf(roleObj);
        if (!"ADMIN".equals(role)) {
            res.put("ok", false);
            res.put("message", "관리자만 접근 가능한 기능입니다.");
            return res;
        }

        if (req == null || req.getActionType() == null || req.getActionReason() == null) {
            res.put("ok", false);
            res.put("message", "actionType null");
            return res;
        }

        try {
            this.reportService.getAdminAction(reportId, loginUserId, req);
            res.put("ok", true);
            return res;
        } catch (IllegalArgumentException | IllegalStateException e) {
            res.put("ok", false);
            res.put("message", e.getMessage());
            return res;
        } catch (Exception e) {
            e.printStackTrace();
            res.put("ok", false);
            res.put("message", "신고 처리 실패");
            return res;
        }
    }
}

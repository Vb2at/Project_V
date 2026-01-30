// com.V_Beat.report.service.ReportService

package com.V_Beat.report.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.V_Beat.report.dao.ReportActionDao;
import com.V_Beat.report.dao.ReportDao;
import com.V_Beat.report.dao.ReportSnapshotDao;
import com.V_Beat.report.dto.AdminReportActionReq;
import com.V_Beat.report.dto.AdminReportList;
import com.V_Beat.report.dto.CreateReportReq;
import com.V_Beat.report.dto.Report;
import com.V_Beat.report.dto.ReportAction;
import com.V_Beat.report.dto.ReportTargetSnapshot;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ReportService {

    private final ReportDao reportDao;
    private final ReportSnapshotDao reportSnapshotDao;
    private final ReportActionDao reportActionDao;

    //관리자 알림(WS)
    private final AdminNotifyService adminNotifyService;

    private final ObjectMapper om = new ObjectMapper();

    public ReportService(
            ReportDao reportDao,
            ReportSnapshotDao reportSnapshotDao,
            ReportActionDao reportActionDao,
            AdminNotifyService adminNotifyService
    ) {
        this.reportDao = reportDao;
        this.reportSnapshotDao = reportSnapshotDao;
        this.reportActionDao = reportActionDao;
        this.adminNotifyService = adminNotifyService;
    }

    //관리자 판별 메서드
    private boolean isAdmin(long userId) {
    	String role = this.reportDao.findUserRole(userId);
    	return "ADMIN".equals(role);
    }
    
    // 신고 접수 (report + snapshot 저장)
    @Transactional
    public Long createReport(long reporterUserId, CreateReportReq req) {
    	String type = req.getTargetType();
    	long targetId = req.getTargetId();
    	
    	//관리자가 신고 방지
    	if (isAdmin(reporterUserId)) {
    		throw new IllegalStateException("관리자는 신고 불가합니다.");
    	}
    	
    	//사용자가 관리자 신고 방지
    	 if ("USER".equals(type) && isAdmin(targetId)) {
    	        throw new IllegalStateException("관리자는 신고할 수 없습니다.");
    	    }

        boolean exists = false;

        if ("USER".equals(type)) {
            exists = this.reportDao.existsUser(targetId) > 0;

            // 본인 신고 방지
            if (targetId == reporterUserId) {
                throw new IllegalStateException("본인은 신고할 수 없습니다");
            }
        } else if ("SONG".equals(type)) {
            exists = reportDao.existsSong(targetId) > 0;

            // 본인이 업로드한 곡 신고 방지
            Integer ownerId = this.reportDao.findSongOwnerId(targetId);
            if (ownerId != null && ownerId.longValue() == reporterUserId) {
                throw new IllegalStateException("본인이 업로드한 곡은 신고할 수 없습니다.");
            }
        } else if ("COMMENT".equals(type)) {
            exists = reportDao.existsComment(targetId) > 0;
        }

        if (!exists) {
            throw new IllegalArgumentException("존재하지 않은 신고대상입니다.");
        }

        // 중복 신고 방지
        int dup = reportDao.countPending(
                reporterUserId,
                req.getTargetType(),
                req.getTargetId(),
                req.getReasonCode()
        );
        if (dup > 0) {
            throw new IllegalStateException("이미 접수된 신고입니다.");
        }

        // report insert
        Report report = new Report();
        report.setReporterUserId(reporterUserId);
        report.setTargetType(req.getTargetType());
        report.setTargetId(req.getTargetId());
        report.setReasonCode(req.getReasonCode());
        report.setDescription(req.getDescription());
        report.setStatus("PENDING");

        reportDao.insert(report);

        // snapshot insert
        ReportTargetSnapshot snap = new ReportTargetSnapshot();
        snap.setReportId(report.getId());
        
        Map<String, Object> extra = new HashMap<>();
        extra.put("targetType", req.getTargetType());
        extra.put("targetId", req.getTargetId());
        extra.put("reasonCode", req.getReasonCode());

        if ("SONG".equals(req.getTargetType())) {
            Map<String, Object> songInfo = reportDao.findSong(req.getTargetId());

            snap.setTargetName((String) songInfo.get("songTitle"));
            extra.put("songOwnerNick", songInfo.get("ownerNick"));
        } else if ("USER".equals(req.getTargetType())) {
            snap.setTargetName("USER#" + req.getTargetId());
        } else {
            snap.setTargetName(req.getTargetType() + "#" + req.getTargetId());
        }

        try {
            snap.setTargetExtra(om.writeValueAsString(extra));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("신고 스냅샷 JSON 생성 실패", e);
        }

        reportSnapshotDao.insert(snap);

        // ✅ 신고 저장 성공 후 관리자에게 WS 알림
        // (AdminNotifyService 내부에서 관리자 목록 조회 후 /user/queue/notify 전송)
        adminNotifyService.notifyNewReport(
                report.getId(),                 // long
                report.getTargetType(),         // String
                report.getTargetId(),           // long
                report.getReasonCode()          // String
        );

        return report.getId();
    }

    // 관리자 신고목록 조회
    public List<AdminReportList> getAdminReportList(String status) {
        return this.reportDao.getAdminReportList(status);
    }

    // ✅ 추가: 관리자 뱃지용 - 처리 대기(PENDING) 신고 개수
    public int getPendingReportCount() {
        return reportDao.countPendingAll();
    }

    // 관리자 신고 처리
    @Transactional
    public void getAdminAction(long reportId, Integer loginUserId, AdminReportActionReq req) {
        Report report = this.reportDao.findById(reportId);
        if (report == null) {
            throw new IllegalArgumentException("존재하지 않은 신고입니다.");
        }

        if (!"PENDING".equals(report.getStatus())) {
            throw new IllegalStateException("이미 처리된 신고입니다.");
        }

        String actionType = req.getActionType().trim();

        // 처리 기록 저장
        ReportAction action = new ReportAction();
        action.setReportId(reportId);
        action.setAdminId(loginUserId);
        action.setActionType(actionType);
        action.setActionReason(req.getActionReason());

        this.reportActionDao.insert(action);

        //신고 상태 변경
        String nextStatus = "IGNORE".equals(actionType) ? "REJECTED" : "RESOLVED";
        this.reportDao.updateStatus(reportId, nextStatus);
        
        //관리자가 차단하면 사용자 차단 처리
        if ("BLOCK".equalsIgnoreCase(actionType)) {
            if ("USER".equals(report.getTargetType())) {
                // 유저 차단 처리
                this.reportDao.updateUserRole(report.getTargetId(), "BLOCK");
            } else if ("SONG".equals(report.getTargetType())) {
                // 노래 차단 처리
                this.reportDao.updateSongStatus(report.getTargetId(), "BLOCKED");
            }
        }
        
        //관리자 처리 후 삭제 처리
        if("DELETE_CONTENT".equalsIgnoreCase(actionType)) {
        	if("SONG".equals(report.getTargetType())) {
        		Long songId = report.getTargetId();
        		
        		//곡 관련 기록 먼저 삭제 (종속)
        		this.reportDao.deleteBySongId(songId);
        		this.reportDao.deleteSongScore(songId);
        		//그 후 곡 삭제 
        		this.reportDao.deleteSong(songId);
        	}
        }
    }
}

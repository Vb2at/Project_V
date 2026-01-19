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
    private final ObjectMapper om = new ObjectMapper();

    public ReportService(ReportDao reportDao, ReportSnapshotDao reportSnapshotDao, ReportActionDao reportActionDao) {
        this.reportDao = reportDao;
        this.reportSnapshotDao = reportSnapshotDao;
        this.reportActionDao = reportActionDao;
    }

    //신고 접수 (reports + snapshot 저장)
    @Transactional
    public Long createReport(long reporterUserId, CreateReportReq req) {

        // 대상 존재 여부 검증
        boolean exists = false;
        String type = req.getTargetType();
        long targetId = req.getTargetId();

        if ("USER".equals(type)) {
            exists = reportDao.existsUser(targetId) > 0;
            
            Integer ownerId = this.reportDao.findSongOwnerId(targetId);
            if(ownerId != null && ownerId.longValue() == reporterUserId) {
            	throw new IllegalStateException("본인이 업로드한 곡은 신고할 수 없습니다.");
            }
            	} else if ("SONG".equals(type)) {
            exists = reportDao.existsSong(targetId) > 0;
        } else if ("COMMENT".equals(type)) {
            exists = reportDao.existsComment(targetId) > 0;
        }

        if (!exists) {
            throw new IllegalArgumentException("존재하지 않은 신고대상입니다.");
        }

        // 중복 신고 방지
        int dup = reportDao.countPending(reporterUserId, req.getTargetType(), req.getTargetId(), req.getReasonCode());
        if (dup > 0) {
            throw new IllegalStateException("이미 접수된 신고입니다.");
        }

        // reports insert
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
        snap.setTargetName(req.getTargetType() + "#" + req.getTargetId());

        Map<String, Object> extra = new HashMap<>();
        extra.put("targetType", req.getTargetType());
        extra.put("targetId", req.getTargetId());
        extra.put("reasonCode", req.getReasonCode());

        try {
            snap.setTargetExtra(om.writeValueAsString(extra));
        } catch (JsonProcessingException e) {
            // 여기서 500으로 죽지 말고 런타임으로 감싸서 "서버 오류" 처리되게
            throw new RuntimeException("신고 스냅샷 JSON 생성 실패", e);
        }

        reportSnapshotDao.insert(snap);

        return report.getId();
    }

    //관리자 신고목록 조회
	public List<AdminReportList> getAdminReportList(String status) {
		return this.reportDao.getAdminReportList(status);
	}

	//관리자 신고 처리
	@Transactional
	public void getAdminAction(long reportId, Integer loginUserId, AdminReportActionReq req) {
		Report report = this.reportDao.findById(reportId);
		if(report == null) {
			throw new IllegalArgumentException("존재하지 않은 신고입니다.");
		}
		
		if(!"PENDING".equals(report.getStatus())) {
			throw new IllegalStateException("이미 처리된 신고입니다.");
		}
		
		String actionType = req.getActionType().trim();
		
		//처리 기록 저장
		ReportAction action = new ReportAction();
		action.setReportId(reportId);
		action.setAdminId(loginUserId);
		action.setActionType(actionType);
		action.setActionReason(req.getActionReason());
		
		this.reportActionDao.insert(action);
		
		//신고 상태 변경
		String nextStatus = "IGNORE".equals(actionType) ? "REJECTED" : "RESOLVED";
		
		this.reportDao.updateStatus(reportId, nextStatus);
	}
}
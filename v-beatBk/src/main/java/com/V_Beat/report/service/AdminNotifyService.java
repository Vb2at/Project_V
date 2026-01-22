package com.V_Beat.report.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.V_Beat.report.dao.ReportDao;

@Service
public class AdminNotifyService {

    private final SimpMessagingTemplate template;
    private final ReportDao reportDao;

    public AdminNotifyService(SimpMessagingTemplate template, ReportDao reportDao) {
        this.template = template;
        this.reportDao = reportDao;
    }

    public void notifyNewReport(long reportId, String targetType, long targetId, String reasonCode) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ADMIN_NOTIFY");
        payload.put("event", "REPORT_NEW");
        payload.put("reportId", reportId);
        payload.put("targetType", targetType);
        payload.put("targetId", targetId);
        payload.put("reasonCode", reasonCode);

        List<Integer> adminIds = reportDao.findAdminUserIds();
        if (adminIds == null || adminIds.isEmpty()) return;

        for (Integer adminId : adminIds) {
            template.convertAndSendToUser(
                String.valueOf(adminId),
                "/queue/notify",
                payload
            );
        }
    }
}

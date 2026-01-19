package com.V_Beat.report.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;

import com.V_Beat.report.dto.ReportAction;

@Mapper
public interface ReportActionDao {

	@Insert("""
			INSERT INTO report_action
				(report_id, admin_id, action_type, action_reason, reg_date)
			VALUES
				(#{reportId}, #{adminId}, #{actionType}, #{actionReason}, NOW())
			""")
	@Options(useGeneratedKeys = true, keyProperty = "id")
	void insert(ReportAction action);
}
package com.V_Beat.report.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;

import com.V_Beat.report.dto.ReportTargetSnapshot;

@Mapper
public interface ReportSnapshotDao {

	//신고 등록
	@Insert("""
			INSERT INTO report_target_snapshot
				(report_id, target_name, target_extra, reg_date)
			VALUES
				(#{reportId}, #{targetName}, #{targetExtra}, NOW())
			""")
	void insert(ReportTargetSnapshot snap);
}
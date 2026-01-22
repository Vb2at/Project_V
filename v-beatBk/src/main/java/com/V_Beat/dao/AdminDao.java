package com.V_Beat.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AdminDao {

    // 너희 DB에 맞게 테이블/컬럼명 수정
    @Select("SELECT id FROM user WHERE role = 'ADMIN'")
    List<Integer> findAdminUserIds();
}

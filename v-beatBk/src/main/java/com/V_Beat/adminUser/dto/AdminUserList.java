package com.V_Beat.adminUser.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserList {
	private long id;
	private String role;	//USER, ADMIN, BLOCK
	private String nickName;
}
package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CheckReq {
	private String loginPw;
	private String email;
	private String code;
	private String nickName;
	private String currentPw;
	private String newPw;
	private String role;
	private int loginType;
}
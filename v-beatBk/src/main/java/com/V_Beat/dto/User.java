package com.V_Beat.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class User {
	private int id;
	private String email;
	private String loginPw;
	private int loginType;
	private String socialId;
	private String nickName;
	private String regDate;
	private int role;
	private String profileImg;
}

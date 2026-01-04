package com.V_Beat;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan({"com.V_Beat.dao", "com.V_Beat.ai.dao"})
public class VBeatApplication {

	public static void main(String[] args) {
		SpringApplication.run(VBeatApplication.class, args);
	}
}

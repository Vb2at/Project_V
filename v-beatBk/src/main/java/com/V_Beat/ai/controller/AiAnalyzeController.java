package com.V_Beat.ai.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.ai.service.AiAnalyzeService;

@RestController
//이 클래스는 API컨트롤러 -> 데이터 응답용 컨트롤러
@RequestMapping("/api/ai")
//컨트롤러 안 모든 URL 앞에 공통으로 붙는 주소
public class AiAnalyzeController {

	private AiAnalyzeService aiAnalyzeService;
	
	public AiAnalyzeController(AiAnalyzeService aiAnalyzeService) {
		this.aiAnalyzeService = aiAnalyzeService;
	}
	
	//음원 업로드, 분석, 노트 생성 ,저장하는 API
	@PostMapping("/analyze/{diff}")
		//POST방식으로 /api/ai/analyze 주소로 요청이 오면 아래 메서드 실행
	public ResponseEntity<Long> analyze(@RequestParam("file") MultipartFile file, @PathVariable String diff) throws Exception {
	//응답 바디에 Long값을 담아 보냄
		Long songId = this.aiAnalyzeService.analyzeSave(file, diff);
		//Flask로 분석 요청 -> song,note DB에 저장 -> 저장된 songId 받아옴
		return ResponseEntity.ok(songId);
	}
}
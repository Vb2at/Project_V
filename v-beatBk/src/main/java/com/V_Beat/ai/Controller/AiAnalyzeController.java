package com.V_Beat.ai.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.ai.Service.AiAnalyzeService;

@RestController
//이 클래스는 API컨트롤러 -> 데이터 응답용 컨트롤러
@RequestMapping("/api/ai")
//컨트롤러 안 모든 URL 앞에 공통으로 붙는 주소
public class AiAnalyzeController {

	private AiAnalyzeService aiAnalyzeService;
	
	public AiAnalyzeController(AiAnalyzeService aiAnalyzeService) {
		this.aiAnalyzeService = aiAnalyzeService;
	}
	
	@PostMapping("/analyze")
		//POST방식으로 /api/ai/analyze 주소로 요청이 오면 아래 메서드 실행
	public ResponseEntity<String> analyze(@RequestParam("file") MultipartFile file) throws Exception {
		String json = this.aiAnalyzeService.analyze(file);
		return ResponseEntity.ok(json);
	}
}
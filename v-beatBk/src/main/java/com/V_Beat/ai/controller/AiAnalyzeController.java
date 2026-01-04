package com.V_Beat.ai.controller;

import java.io.File;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.ai.dto.SongNotesResult;
import com.V_Beat.ai.service.AiAnalyzeService;
import com.V_Beat.dto.Song;

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
	
	//특정 곡에 대한 데이터 전체 조회 API
	@GetMapping("/song/{songId}/audio")
	public ResponseEntity<Resource> getAudio(@PathVariable Long songId) {
	    Song song = this.aiAnalyzeService.getSong(songId);
	    System.out.println("songId=" + songId);
	    System.out.println("song=" + song);

	    if (song == null) {
	        System.out.println("-> 404: song null");
	        return ResponseEntity.notFound().build();
	    }

	    String path = song.getFilePath();
	    System.out.println("filePath=" + path);

	    if (path == null || path.isBlank()) {
	        System.out.println("-> 400: filePath null/blank");
	        return ResponseEntity.badRequest().build();
	    }

	    File file = new File(path);
	    System.out.println("abs=" + file.getAbsolutePath());
	    System.out.println("exists=" + file.exists() + ", len=" + (file.exists() ? file.length() : -1));

	    if (!file.exists()) {
	        System.out.println("-> 404: file not found");
	        return ResponseEntity.notFound().build();
	    }

	    Resource resource = new FileSystemResource(file);
	    return ResponseEntity.ok()
	            .contentType(MediaType.parseMediaType("audio/mpeg"))
	            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
	            .contentLength(file.length())
	            .body(resource);
	}
	
	@GetMapping("/song/{songId}/notes")
	public ResponseEntity<SongNotesResult> getNotes(@PathVariable Long songId) {
		return ResponseEntity.ok(this.aiAnalyzeService.getSongNotes(songId));
	}
	
	@GetMapping("/song/{songId}/cover")
	public ResponseEntity<Resource> getCover(@PathVariable Long songId) {
	    Song song = this.aiAnalyzeService.getSong(songId);
	    if (song == null) return ResponseEntity.notFound().build();

	    String path = song.getCoverPath();
	    if (path == null || path.isBlank()) return ResponseEntity.notFound().build();

	    File file = new File(path);
	    if (!file.exists()) return ResponseEntity.notFound().build();

	    MediaType type = path.endsWith(".png")
	            ? MediaType.IMAGE_PNG
	            : MediaType.IMAGE_JPEG;

	    Resource resource = new FileSystemResource(file);
	    return ResponseEntity.ok()
	            .contentType(type)
	            .contentLength(file.length())
	            .body(resource);
	}
	
	@GetMapping("/song/{songId}")
	public ResponseEntity<Song> getSongInfo(@PathVariable Long songId) {
	    Song song = this.aiAnalyzeService.getSong(songId);
	    if (song == null) {
	        return ResponseEntity.notFound().build();
	    }
	    return ResponseEntity.ok(song);
	}
}
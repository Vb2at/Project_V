package com.V_Beat.ai.service;

import java.io.File;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.ai.dao.AiAnalyzeDao;
import com.V_Beat.ai.dto.NoteResult;
import com.V_Beat.ai.dto.SongNotesResult;
import com.V_Beat.dto.Note;
import com.V_Beat.dto.Song;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiAnalyzeService {

	//Flask 서버의 분석 API주소 -> 추후 서버 분리 / 배포 시 여기 변경!
	private static String PYTHON_URL = "http://127.0.0.1:5000/analyze";
	
	//Spring에서 다른 서버로 HTTP요청 보낼 때 쓰는 객체
	//현재는 mp3파일을 Python 서버로 전송, JSON 응답 받는 용도
	private RestTemplate restTemplate = new RestTemplate();
	
	private AiAnalyzeDao aiAnalyzeDao;
	
	public AiAnalyzeService(AiAnalyzeDao aiAnalyzeDao) {
		this.aiAnalyzeDao = aiAnalyzeDao;
	}
	
	//컨트롤러에서 받은 mp3 파일 처리하는 메서드, 반환값 = JSON 문자열
	public String analyze(MultipartFile file) throws Exception {
		// Python 서버로 보낼 HTTP 요청 본문
		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		
		//파일을 HTTP에 실을 수 있도록 변환
		//file.getBytes(): 실제 mp3 데이터
		//ByteArrayResource: HTTP 요청에 실을 수 있는 형태
		ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
			@Override
			public String getFilename() {
				return file.getOriginalFilename();
			}
		};
		
		//"file"이라는 키로 파일 추가 -> Flask에서 request.files["file"]과 일치
		body.add("file", fileResource);
		
		//요청이 multipart/form-data라는 걸 명시, 파일 업로드 시 필수 설정!
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.MULTIPART_FORM_DATA);
		
		//body + headers를 합쳐서 Python 서버로 보낼 HTTP 요청 완성
		HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
		
		//POST방식으로 Flask 서버 호출, 응답을 String(JSON)으로 받음
		ResponseEntity<String> response = 
				restTemplate.postForEntity(PYTHON_URL, request, String.class);
		
		return response.getBody();
	}
	
	@Transactional
	public Long analyzeSave(MultipartFile file) throws Exception{
		
		//Flask 분석 호출 (JSON 문자열 받기)
		String json = analyze(file);
		
		//JSON 파싱 준비, JSON 문자열을 트리 구조로 변환
		ObjectMapper mapper = new ObjectMapper();
		JsonNode root = mapper.readTree(json);
		JsonNode notesNode = root.get("notes");
		
		if(notesNode == null || !notesNode.isArray()) {
			throw new IllegalStateException("Flask에 notes 배열 없음");
		}
		
		//song 테이블 저장
		Song song = new Song();
		song.setTitle(file.getOriginalFilename());
		song.setFilePath(null); //추후 수정
		
		this.aiAnalyzeDao.insertSong(song);
		Long songId = song.getId();
		
		//파일 저장
		String uploadDir = "C:/VBeat/upload";
		File dir = new File(uploadDir);
		if(!dir.exists()) dir.mkdirs();
		
		String original = file.getOriginalFilename();
		String ext = (original != null && original.contains("."))
					 ? original.substring(original.lastIndexOf("."))
					 : ".mp3";
		
		String savedPath = uploadDir + "/" + songId + ext;
		file.transferTo(new File(savedPath));
		
		//filePath 업데이트
		song.setId(songId);
		song.setFilePath(savedPath);
		this.aiAnalyzeDao.updateSongFilePath(song);
		
		//note 테이블 저장
		for(JsonNode noteNode : notesNode) {
			
			Note note = new Note();
			note.setSongId(songId);
			note.setNoteTime(noteNode.get("time").decimalValue());
			note.setLane(noteNode.get("lane").intValue());
			
			String type = (noteNode.has("type") && !noteNode.get("type").isNull())
					? noteNode.get("type").asText()
					: "tap";
			note.setType(type);
			
			if("long".equals(type)) {
				if(!noteNode.has("endTime") || noteNode.get("endTime").isNull()) {
					throw new IllegalArgumentException("long note requires endTime");
				}
				note.setEndTime(noteNode.get("endTime").decimalValue());
			} else {
				note.setEndTime(null);			}
			this.aiAnalyzeDao.insertNote(note);
		}
		return songId;
	}
	
	@Transactional(readOnly=true)
	public SongNotesResult getSongNotes(Long songId) {
		List<NoteResult> notes = this.aiAnalyzeDao.getSongNotes(songId);
		return new SongNotesResult(songId, notes);
	}

	public Song getSong(Long songId) {
		return this.aiAnalyzeDao.getSong(songId);
	}
}
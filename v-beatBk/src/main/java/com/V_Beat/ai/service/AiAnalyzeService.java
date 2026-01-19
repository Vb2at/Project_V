package com.V_Beat.ai.service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

import org.jaudiotagger.audio.AudioFile;
import org.jaudiotagger.audio.AudioFileIO;
import org.jaudiotagger.audio.AudioHeader;
import org.jaudiotagger.tag.FieldKey;
import org.jaudiotagger.tag.Tag;
import org.jaudiotagger.tag.images.Artwork;
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
import com.V_Beat.dto.Note;
import com.V_Beat.dto.Song;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiAnalyzeService {

	// Flask 서버 분석 API (배포/분리 시 여기만 변경)
	private static final String PYTHON_URL = "http://127.0.0.1:5000/analyze";

	// 업로드 저장 경로 (원하면 application.properties로 빼도 됨)
	private static final String UPLOAD_DIR = "C:/VBeat/upload";
	private static final String COVER_DIR = "C:/VBeat/upload/covers";

	private final RestTemplate restTemplate = new RestTemplate();
	private final AiAnalyzeDao aiAnalyzeDao;

	public AiAnalyzeService(AiAnalyzeDao aiAnalyzeDao) {
		this.aiAnalyzeDao = aiAnalyzeDao;
	}

	@Transactional
	public Long analyzeSave(MultipartFile file, String diff, String reqVisibility, int loginUserId) throws Exception {

		// 0) diff 기본값
		if (diff == null || diff.isBlank()) {
			diff = "normal";
		}

		// 1) Flask로 파일 + diff 전송
		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		body.add("file", new ByteArrayResource(file.getBytes()) {
			@Override
			public String getFilename() {
				return file.getOriginalFilename();
			}
		});
		diff = diff.toLowerCase();
		body.add("diff", diff);
		System.out.println("DIFF_TO_FLASK = " + diff);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.MULTIPART_FORM_DATA);

		HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
		ResponseEntity<String> resp = restTemplate.postForEntity(PYTHON_URL, request, String.class);

		String json = resp.getBody();
		if (json == null || json.isBlank()) {
			throw new RuntimeException("Flask response body is empty");
		}

		// 2) JSON 파싱
		ObjectMapper mapper = new ObjectMapper();
		JsonNode root = mapper.readTree(json);
		JsonNode notesNode = root.get("notes");

		if (notesNode == null || !notesNode.isArray()) {
			throw new IllegalStateException("Flask 응답에 notes 배열이 없습니다.");
		}
		// preview 파싱
		double previewStartSec = root.path("previewStartSec").asDouble(0.0);
		double previewDurationSec = root.path("previewDurationSec").asDouble(10.0);

		// 3) song INSERT (id 생성)
		Song song = new Song();
		song.setTitle(file.getOriginalFilename());
		song.setArtist("unknown");
		song.setDuration("0");
		song.setDiff(diff);
		song.setFilePath(null);
		song.setCoverPath(null);

		String visibility = reqVisibility;
		if ("PUBLIC".equals(reqVisibility)) {
			visibility = "PENDING";
		}

		song.setUserId(loginUserId);
		song.setVisibility(visibility);

		this.aiAnalyzeDao.insertSong(song);
		Long songId = song.getId();

		// 4) mp3 파일 저장 (songId로 파일명 고정)
		Files.createDirectories(Path.of(UPLOAD_DIR));

		String original = file.getOriginalFilename();
		String ext = (original != null && original.contains(".")) ? original.substring(original.lastIndexOf("."))
				: ".mp3";

		String savedPath = UPLOAD_DIR + "/" + songId + ext;
		file.transferTo(new File(savedPath));

		// preview생성 + DB저장
		String previewPath = UPLOAD_DIR + "/" + songId + "_preview.mp3";
		makePreviewMp3(savedPath, previewPath, previewStartSec, previewDurationSec);
		this.aiAnalyzeDao.updatePreviewPath(songId, previewPath);

		// 5) 메타(artist/duration) 추출 후 DB 업데이트
		extractAndSaveMeta(savedPath, songId);

		// 6) filePath 업데이트
		song.setId(songId);
		song.setFilePath(savedPath);
		this.aiAnalyzeDao.updateSongFilePath(song);

		// 7) 커버 추출 후 DB 업데이트
		String coverPath = extractAndSaveCover(savedPath, songId);
		if (coverPath != null) {
			song.setCoverPath(coverPath);
			this.aiAnalyzeDao.updateSongCoverPath(song);
		}

		// 8) notes INSERT
		for (JsonNode noteNode : notesNode) {
			Note note = new Note();
			note.setSongId(songId);
			note.setNoteTime(noteNode.get("time").decimalValue());
			note.setLane(noteNode.get("lane").intValue());

			String type = (noteNode.has("type") && !noteNode.get("type").isNull()) ? noteNode.get("type").asText()
					: "tap";
			note.setType(type);

			if ("long".equals(type)) {
				if (!noteNode.has("endTime") || noteNode.get("endTime").isNull()) {
					throw new IllegalArgumentException("long note requires endTime");
				}
				note.setEndTime(noteNode.get("endTime").decimalValue());
			} else {
				note.setEndTime(null);
			}

			this.aiAnalyzeDao.insertNote(note);
		}

		return songId;
	}

	// MP3 메타(artist, duration) 추출해서 DB 업데이트
	private void extractAndSaveMeta(String mp3Path, Long songId) {
		try {
			AudioFile audioFile = AudioFileIO.read(new File(mp3Path));
			Tag tag = audioFile.getTag();
			AudioHeader header = audioFile.getAudioHeader();

			String artist = "unknown";
			if (tag != null) {
				String a = tag.getFirst(FieldKey.ARTIST);
				if (a != null && !a.isBlank()) {
					artist = a;
				}
			}

			String duration = "0";
			if (header != null) {
				duration = String.valueOf(header.getTrackLength());
			}

			Song s = new Song();
			s.setId(songId);
			s.setArtist(artist);
			s.setDuration(duration);

			this.aiAnalyzeDao.updateSongMeta(s);
		} catch (Exception e) {
			// 메타 없는 mp3도 많으니 실패해도 저장 프로세스는 진행
			e.printStackTrace();
		}
	}

	// MP3 커버 추출해서 파일로 저장하고 저장 경로 리턴 (없으면 null)
	private String extractAndSaveCover(String mp3Path, Long songId) {
		try {
			AudioFile audioFile = AudioFileIO.read(new File(mp3Path));
			Tag tag = audioFile.getTag();
			if (tag == null)
				return null;

			Artwork artwork = tag.getFirstArtwork();
			if (artwork == null)
				return null;

			byte[] imageData = artwork.getBinaryData();
			if (imageData == null || imageData.length == 0)
				return null;

			String ext = "jpg";
			String mime = artwork.getMimeType();
			if (mime != null && mime.toLowerCase().contains("png"))
				ext = "png";

			Files.createDirectories(Path.of(COVER_DIR));

			String coverPath = COVER_DIR + "/" + songId + "." + ext;
			Files.write(Path.of(coverPath), imageData);

			return coverPath;
		} catch (Exception e) {
			// 커버 없는 mp3도 많음 → 정상 케이스
			return null;
		}
	}

	private void makePreviewMp3(String fullPath, String previewPath, double startSec, double durSec) throws Exception {
		// 너무 짧은 곡/이상값 방어
		if (startSec < 0)
			startSec = 0;
		if (durSec <= 0)
			durSec = 10;

		ProcessBuilder pb = new ProcessBuilder("ffmpeg", "-ss", String.valueOf(startSec), "-t", String.valueOf(durSec),
				"-i", fullPath, "-y", "-vn", "-acodec", "libmp3lame", "-q:a", "4", previewPath);

		pb.redirectErrorStream(true);
		Process p = pb.start();

		try (var r = new java.io.BufferedReader(new java.io.InputStreamReader(p.getInputStream()))) {
			while (r.readLine() != null) {
				/* 로그 버림(필요하면 출력) */ }
		}

		int code = p.waitFor();
		if (code != 0) {
			throw new RuntimeException("ffmpeg failed, exitCode=" + code);
		}

		// 생성 확인(안전)
		File out = new File(previewPath);
		if (!out.exists() || out.length() <= 0) {
			throw new RuntimeException("preview mp3 not created: " + previewPath);
		}
	}

}

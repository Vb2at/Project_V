package com.V_Beat.ai.controller;

import java.io.File;
import java.util.List;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.ai.dto.NoteResult;
import com.V_Beat.ai.dto.SongNotesResult;
import com.V_Beat.ai.service.SongService;
import com.V_Beat.dto.Song;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/songs")
public class SongController {

	private SongService songService;

	public SongController(SongService songService) {
		this.songService = songService;
	}

	@PostMapping("/{songId}/update")
	public ResponseEntity<Void> updateSong(@PathVariable Long songId, @RequestParam String title,
			@RequestParam String artist, @RequestParam String visibility,
			@RequestParam(required = false) MultipartFile cover, HttpSession session) {
		Integer loginUserId = (Integer) session.getAttribute("loginUserId");
		if (loginUserId == null) {
			return ResponseEntity.status(401).build(); // 로그인 안 됨
		}

		songService.updateSongInfo(songId, loginUserId, title, artist, visibility, cover);
		return ResponseEntity.ok().build();
	}

	// 음원 조회 API
	@GetMapping("/{songId}/audio")
	public ResponseEntity<Resource> getAudio(@PathVariable Long songId, HttpSession session) {
		Song song = this.songService.getSong(songId);

		if (song == null) {
			System.out.println("-> 404: song null");
			return ResponseEntity.notFound().build();
		}

		Integer loginUserId = (Integer) session.getAttribute("loginUserId");
		Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
		if (isAdmin == null)
			isAdmin = false;

		if (!songService.canAccess(song, loginUserId, isAdmin)) {
			return ResponseEntity.status(403).build();
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
		return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/mpeg"))
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
				.contentLength(file.length()).body(resource);
	}

	// 노트 조회 API
	@GetMapping("/{songId}/notes")
	public ResponseEntity<SongNotesResult> getNotes(@PathVariable Long songId, HttpSession session) {
		Song song = this.songService.getSong(songId);
		if (song == null) {
			return ResponseEntity.notFound().build();
		}

		Integer loginUserId = (Integer) session.getAttribute("loginUserId");
		Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
		if (isAdmin == null)
			isAdmin = false;

		if (!songService.canAccess(song, loginUserId, isAdmin)) {
			return ResponseEntity.status(403).build();
		}

		return ResponseEntity.ok(this.songService.getSongNotes(songId));
	}
	
	// 노트 저장 API 
	// 노트 저장 API (POST + PUT 둘 다 허용)
	@RequestMapping(
	    value = "/{songId}/notes",
	    method = { RequestMethod.POST, RequestMethod.PUT }
	)
	public ResponseEntity<Void> saveNote(
	    @PathVariable Long songId,
	    @RequestBody List<NoteResult> notes,
	    HttpSession session
	) {
	    Integer loginUserId = (Integer) session.getAttribute("loginUserId");
	    if (loginUserId == null) {
	        return ResponseEntity.status(401).build();
	    }

	    Song song = songService.getSong(songId);
	    if (song == null) {
	        return ResponseEntity.notFound().build();
	    }

	    Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
	    if (isAdmin == null) isAdmin = false;

	    if (!songService.canAccess(song, loginUserId, isAdmin)) {
	        return ResponseEntity.status(403).build();
	    }

	    songService.replaceSongNotes(songId, notes);
	    return ResponseEntity.ok().build();
	}


	// songId 조회
	@GetMapping("/{songId}")
	public ResponseEntity<Song> getSongInfo(@PathVariable Long songId, HttpSession session) {
		Song song = this.songService.getSong(songId);
		if (song == null) {
			return ResponseEntity.notFound().build();
		}

		Integer loginUserId = (Integer) session.getAttribute("loginUserId");
		Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
		if (isAdmin == null)
			isAdmin = false;

		if (!songService.canAccess(song, loginUserId, isAdmin)) {
			return ResponseEntity.status(403).build();
		}

		return ResponseEntity.ok(song);
	}

	// 커버 이미지 관련 API
	@GetMapping("/{songId}/cover")
	public ResponseEntity<Resource> getCover(@PathVariable Long songId, HttpSession session) {
		Song song = this.songService.getSong(songId);
		if (song == null)
			return ResponseEntity.notFound().build();

		Integer loginUserId = (Integer) session.getAttribute("loginUserId");
		Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
		if (isAdmin == null)
			isAdmin = false;

		if (!songService.canAccess(song, loginUserId, isAdmin)) {
			return ResponseEntity.status(403).build();
		}

		String path = song.getCoverPath();
		if (path == null || path.isBlank())
			return ResponseEntity.notFound().build();

		File file = new File(path);
		if (!file.exists())
			return ResponseEntity.notFound().build();

		String lower = path.toLowerCase();
		MediaType type = lower.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;

		Resource resource = new FileSystemResource(file);
		return ResponseEntity.ok().contentType(type).contentLength(file.length()).body(resource);
	}

	// 비로그인 시 공개 플레이리스트 API
	@GetMapping
	public ResponseEntity<List<Song>> getPublicSongs() {
		return ResponseEntity.ok(this.songService.getPublicSongs());
	}

	// 내 곡 목록
	@GetMapping("/my")
	public ResponseEntity<List<Song>> getMySongs(HttpSession session) {
		Integer loginUserId = (Integer) session.getAttribute("loginUserId");
		if (loginUserId == null) {
			return ResponseEntity.status(401).build();
		}
		return ResponseEntity.ok(songService.getMySongs(loginUserId));
	}

	// 음원 미리듣기 (싸비 5~10초)
	@GetMapping("/{songId}/preview")
	public ResponseEntity<Resource> getPreview(@PathVariable Long songId, HttpSession session) {
		Song song = this.songService.getSong(songId);
		if (song == null) {
			return ResponseEntity.notFound().build();
		}

		Integer loginUserId = (Integer) session.getAttribute("loginUserId");
		Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
		if (isAdmin == null)
			isAdmin = false;

		if (!songService.canAccess(song, loginUserId, isAdmin)) {
			return ResponseEntity.status(403).build();
		}

		String previewPath = song.getPreviewPath();
		if (previewPath == null || previewPath.isBlank()) {
			return ResponseEntity.notFound().build();
		}

		File file = new File(previewPath);
		if (!file.exists()) {
			return ResponseEntity.notFound().build();
		}

		Resource resource = new FileSystemResource(file);

		return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/mpeg"))
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
				.header(HttpHeaders.CACHE_CONTROL, "no-store").contentLength(file.length()).body(resource);
	}

	@GetMapping("/pending")
	public ResponseEntity<List<Song>> getPendingSongs(HttpSession session) {
		Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
		if (isAdmin == null || !isAdmin) {
			return ResponseEntity.status(403).build();
		}

		return ResponseEntity.ok(songService.getPendingSongs(true));
	}

	@PostMapping("/{songId}/review")
	public ResponseEntity<Void> reviewSong(@PathVariable Long songId, @RequestParam String result, // PUBLIC or BLOCKED
			HttpSession session) {
		Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
		if (isAdmin == null || !isAdmin) {
			return ResponseEntity.status(403).build();
		}

		try {
			songService.reviewSong(songId, result, true);
			return ResponseEntity.ok().build();
		} catch (RuntimeException e) {
			return ResponseEntity.badRequest().build();
		}
	}
	

	

}

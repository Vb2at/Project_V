package com.V_Beat.ai.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.V_Beat.ai.dao.SongDao;
import com.V_Beat.ai.dto.MySong;
import com.V_Beat.ai.dto.NoteResult;
import com.V_Beat.ai.dto.SongNotesResult;
import com.V_Beat.dao.ScoreDao;
import com.V_Beat.dto.Song;
import com.V_Beat.report.dao.ReportDao;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class SongService {

	private final SongDao songDao;
	private final ScoreDao scoreDao;
	private final ReportDao reportDao;

	// === 핵심 상수 ===
	private static final int MAX_SONGS_PER_USER = 20;

	public SongService(SongDao songDao, ScoreDao scoreDao, ReportDao reportDao) {
		this.songDao = songDao;
		this.scoreDao = scoreDao;
		this.reportDao = reportDao;
	}

	// --------------------------------------------------
	// 공통 유틸
	// --------------------------------------------------
	private void checkUploadLimit(long userId, boolean isAdmin) {
		if (isAdmin)
			return; // 관리자 예외

		long count = songDao.countByUserId(userId);

		if (count >= MAX_SONGS_PER_USER) {
			throw new ResponseStatusException(FORBIDDEN, "곡 등록은 사용자당 최대 20곡까지 가능합니다.");
		}
	}

	// --------------------------------------------------
	// 조회 계열 (변경 없음)
	// --------------------------------------------------
	@Transactional(readOnly = true)
	public Song getSong(Long songId) {
		return songDao.getSong(songId);
	}

	@Transactional(readOnly = true)
	public SongNotesResult getSongNotes(Long songId) {
		Song song = songDao.getSong(songId);
		List<NoteResult> notes = songDao.getSongNotes(songId);
		return new SongNotesResult(songId, song.getDiff(), notes);
	}

	@Transactional(readOnly = true)
	public List<Song> getPublicSongs() {
		return songDao.getPublicSongs();
	}

	public boolean canPlayWithLogout(Song song) {
		return song != null && "PUBLIC".equals(song.getVisibility());
	}

	// --------------------------------------------------
	// 🔥 핵심: 곡 정보 수정(제한 체크 포함)
	// --------------------------------------------------
	@Transactional
	public void updateSongInfo(Long songId, int loginUserId, String title, String artist, String visibility,
			MultipartFile cover, boolean isAdmin // ← 새로 추가
	) {

		Song song = songDao.getSong(songId);
		if (song == null) {
			throw new ResponseStatusException(NOT_FOUND, "song not found");
		}

		if (song.getUserId() != loginUserId) {
			throw new ResponseStatusException(FORBIDDEN, "no permission");
		}

		// ★★★ 여기서 제한 체크 ★★★
		checkUploadLimit(loginUserId, isAdmin);

		String coverPath = null;

		if (cover != null && !cover.isEmpty()) {
			try {
				String uploadDir = "upload/cover/";
				Files.createDirectories(Paths.get(uploadDir));

				String fileName = UUID.randomUUID() + "_" + cover.getOriginalFilename();
				Path savePath = Paths.get(uploadDir, fileName);

				cover.transferTo(savePath.toFile());
				coverPath = savePath.toString();
			} catch (IOException e) {
				throw new RuntimeException("커버 이미지 저장 실패", e);
			}
		}

		if (coverPath != null) {
			songDao.updateSongWithCover(songId, title, artist, coverPath);
		} else {
			songDao.updateSong(songId, title, artist);
		}

		// ----- 공개 상태 처리 (변경 없음) -----
		String v = (visibility == null) ? "PRIVATE" : visibility.trim().toUpperCase();
		String saveVisibility;
		String shareToken = song.getShareToken();

		if ("PRIVATE".equals(v)) {
			saveVisibility = "PRIVATE";
			shareToken = null;
		} else if ("PUBLIC".equals(v)) {
			saveVisibility = "PENDING";
		} else if ("UNLISTED".equals(v)) {
			saveVisibility = "UNLISTED";
			if (shareToken == null) {
				shareToken = UUID.randomUUID().toString().replace("-", "");
			}
		} else {
			throw new IllegalArgumentException("invalid visibility");
		}

		songDao.updateVisibilityAndToken(songId, saveVisibility, shareToken);
	}

	// --------------------------------------------------
	// 관리자 심사 (변경 없음)
	// --------------------------------------------------
	@Transactional(readOnly = true)
	public List<Song> getPendingSongs(boolean isAdmin) {
		if (!isAdmin)
			throw new ResponseStatusException(FORBIDDEN, "admin only");

		return songDao.getPendingSongs();
	}

	@Transactional
	public void reviewSong(Long songId, String result, String reason, int adminId) {
		result = result.toUpperCase();

		if (!List.of("PUBLIC", "PRIVATE", "BLOCKED").contains(result)) {
			throw new RuntimeException("invalid review result");
		}

		Song song = songDao.getSong(songId);
		if (song == null)
			throw new RuntimeException("song not found");

		if (!"PENDING".equals(song.getVisibility())) {
			throw new RuntimeException("not pending");
		}

		if (!"PUBLIC".equals(result)) {
			if (reason == null || reason.trim().isEmpty()) {
				throw new RuntimeException("review reason required");
			}
		}

		int updated = songDao.updateVisibility(songId, result, reason, adminId);

		if (updated == 0) {
			throw new RuntimeException("review failed");
		}
	}

	// --------------------------------------------------
	// 내 곡 조회 (변경 없음)
	// --------------------------------------------------
	@Transactional(readOnly = true)
	public List<MySong> getMySongs(int userId, String visibility) {
		if (visibility != null) {
			visibility = visibility.toUpperCase();
		}

		if (visibility == null || "ALL".equals(visibility)) {
			return songDao.findByUserId(userId);
		}

		List<MySong> all = songDao.getMySongs(userId);

		String v = visibility.toUpperCase();
		return all.stream().filter(s -> v.equals(s.getVisibility())).toList();
	}

	// --------------------------------------------------
	// 삭제 (변경 없음)
	// --------------------------------------------------
	@Transactional
	public void deleteSong(long songId, long loginUserId) {
		Song song = songDao.getSong(songId);

		if (song == null) {
			throw new ResponseStatusException(NOT_FOUND);
		}

		if (song.getUserId() != loginUserId) {
			throw new ResponseStatusException(FORBIDDEN);
		}

		scoreDao.deleteBySongId(songId);
		songDao.deleteSongNotes(songId);
		reportDao.deleteBySongId(songId);
		songDao.deleteSong(songId);

		deleteFile(song.getFilePath());
		deleteFile(song.getPreviewPath());
		deleteFile(song.getCoverPath());
	}

	@Transactional
	public void replaceSongNotes(Long songId, List<NoteResult> notes) {

		// 1. 기존 노트 전부 삭제
		songDao.deleteSongNotes(songId);

		// 2. 새 노트 전부 삽입
		for (NoteResult n : notes) {
			songDao.insertSongNote(songId, n.getLane(), n.getType(), n.getTime(), n.getEndTime());
		}
	}

	private void deleteFile(String path) {
		if (path == null || path.isBlank())
			return;

		try {
			Files.deleteIfExists(Paths.get(path));
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	// --------------------------------------------------
	// 접근 제어 (변경 없음)
	// --------------------------------------------------
	public boolean canAccess(Song song, Integer loginUserId, Boolean isAdmin, String token) {
		if (Boolean.TRUE.equals(isAdmin))
			return true;

		if ("PRIVATE".equals(song.getVisibility())) {
			return loginUserId != null && song.getUserId() == loginUserId;
		}

		if ("UNLISTED".equals(song.getVisibility())) {
			return token != null && token.equals(song.getShareToken());
		}

		return song.getIsPublic();
	}

	public Song getSongByToken(String token) {
		return songDao.getSongByToken(token);
	}

	public boolean canAccessEditor(Song song, Integer loginUserId, Boolean isAdmin) {
		if (Boolean.TRUE.equals(isAdmin))
			return true;

		return loginUserId != null && song.getUserId() == loginUserId;
	}

	public Integer getSongLengthSec(long songId) {
		Song song = songDao.getSong(songId);
		if (song == null || song.getDuration() == null)
			return 0;

		// duration 예: "03:45" 가정 → 초로 변환
		String[] parts = song.getDuration().split(":");
		int minutes = Integer.parseInt(parts[0]);
		int seconds = Integer.parseInt(parts[1]);

		return minutes * 60 + seconds;
	}

}

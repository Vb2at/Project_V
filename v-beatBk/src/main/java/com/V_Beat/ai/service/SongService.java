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

	private SongDao songDao;
	private ScoreDao scoreDao;
	private ReportDao reportDao;

	public SongService(SongDao songDao, ScoreDao scoreDao, ReportDao reportDao) {
		this.songDao = songDao;
		this.scoreDao = scoreDao;
		this.reportDao = reportDao;
	}

	// 상태 상수
	private static final List<String> VISIBILITY_ALLOWED = List.of("PRIVATE", "UNLISTED");

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
		return this.songDao.getPublicSongs();
	}

	public boolean canPlayWithLogout(Song song) {
		return song != null && "PUBLIC".equals(song.getVisibility());
	}

@Transactional
public void updateSongInfo(
        Long songId,
        int loginUserId,
        String title,
        String artist,
        String visibility,
        MultipartFile cover
) {

    Song song = songDao.getSong(songId);
    if (song == null) {
        throw new RuntimeException("song not found");
    }

    if (song.getUserId() != loginUserId) {
        throw new RuntimeException("no permission");
    }

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

    // 제목 / 아티스트 / 커버 업데이트
    if (coverPath != null) {
        songDao.updateSongWithCover(songId, title, artist, coverPath);
    } else {
        songDao.updateSong(songId, title, artist);
    }

    // ===== 공개 상태 처리 =====
    String v = (visibility == null) ? "PRIVATE" : visibility.trim().toUpperCase();
    String saveVisibility;
    String shareToken = song.getShareToken();

    if ("PRIVATE".equals(v)) {
        saveVisibility = "PRIVATE";
        shareToken = null;
    } else if ("PUBLIC".equals(v)) {
        // 🔥 공개 요청은 즉시 공개가 아니라 심사 대기
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

	@Transactional(readOnly = true)
	public List<Song> getPendingSongs(boolean isAdmin) {
		if (!isAdmin)
			throw new RuntimeException("admin only");
		return songDao.getPendingSongs();
	}

	//관리자 공개곡 심사처리 
	@Transactional
	public void reviewSong(Long songId, String result, String reason, int adminId) {
		result = result.toUpperCase();

		// 허용 상태 검증
		if (!List.of("PUBLIC", "PRIVATE", "BLOCKED").contains(result)) {
	        throw new RuntimeException("invalid review result");
	    }
		// 곡 존재하는 지 검증
		Song song = songDao.getSong(songId);
		if (song == null)
			throw new RuntimeException("song not found");
		// 곡 상태 확인
		if (!"PENDING".equals(song.getVisibility())) {
			throw new RuntimeException("not pending");
		}
		//반려, 차단은 사유 필수
		if (!"PUBLIC".equals(result)) {
			if (reason == null || reason.trim().isEmpty()) {
				throw new RuntimeException("review reason required");
			}
		}

		// DB 업데이트
		int updated = this.songDao.updateVisibility(songId, result, reason, adminId);
		
		if (updated == 0) {
			throw new RuntimeException("review failed");
		}
	}
	
	// 본인 업록드 곡 조회
	@Transactional(readOnly = true)
	public List<MySong> getMySongs(int userId, String visibility) {
		if (visibility != null) {
			visibility = visibility.toUpperCase();
		}

		if (visibility == null || "ALL".equals(visibility)) {
			return this.songDao.findByUserId(userId);
		}

		List<MySong> all = this.songDao.getMySongs(userId);

		if (visibility == null || "ALL".equalsIgnoreCase(visibility)) {
		    return all;
		}

		String v = visibility.toUpperCase();
		return all.stream()
		        .filter(s -> v.equals(s.getVisibility()))
		        .toList();
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

	// 파일 삭제 메서드
	private void deleteFile(String path) {
		if (path == null || path.isBlank()) {
			return;
		}

		try {
			Path filePath = Paths.get(path);
			Files.deleteIfExists(filePath);
		} catch (IOException e) {
			// 파일 삭제 실패는 서비스 실패가 아님
			e.printStackTrace();
		}
	}

	// 곡 삭제
	@Transactional
	public void deleteSong(long songId, long loginUserId) {
		// 노래 조회
		Song song = this.songDao.getSong(songId);

		// 노래 검증
		if (song == null) {
			throw new ResponseStatusException(NOT_FOUND);
		}

		// 노래 업로드 유저 로그인 유저 같은지 검증
		if (song.getUserId() != loginUserId) {
			throw new ResponseStatusException(FORBIDDEN);
		}

		// 해당 곡 관련 파일
		String audioPath = song.getFilePath();
		String previewPath = song.getPreviewPath();
		String coverPath = song.getCoverPath();

		// score 삭제
		this.scoreDao.deleteBySongId(songId);

		// note 삭제
		this.songDao.deleteSongNotes(songId);

		// report에 관련 기록 삭제
		this.reportDao.deleteBySongId(songId);

		// song 삭제
		this.songDao.deleteSong(songId);

		// 해당 곡 관련 파일들 삭제
		deleteFile(audioPath);
		deleteFile(previewPath);
		deleteFile(coverPath);
	}

	@Transactional(readOnly = true)
	public Integer getSongLengthSec(Long songId) {
	    Song song = songDao.getSong(songId);
	    if (song == null) return null;

	    // Song에는 duration(String)만 존재
	    String duration = song.getDuration();
	    if (duration == null || duration.isBlank()) return null;

	    try {
	        return Integer.parseInt(duration);
	    } catch (NumberFormatException e) {
	        return null;
	    }
	}

	// 곡 제한 접근 제어
	public boolean canAccess(Song song, Integer loginUserId, Boolean isAdmin, String token) {

	    if (Boolean.TRUE.equals(isAdmin)) {
	        return true;                       // 관리자 통과
	    }

	    // ─────────────────────────────────────
	    // ① PRIVATE → 소유자만 허용
	    if ("PRIVATE".equals(song.getVisibility())) {
	        return loginUserId != null 
	                && song.getUserId() == loginUserId;
	    }

	    // ② UNLISTED → 토큰이 맞으면 허용
	    if ("UNLISTED".equals(song.getVisibility())) {
	        return token != null && token.equals(song.getShareToken());
	    }

	    // ③ PUBLIC → 누구나 허용
	    return song.getIsPublic();
	}

	public Song getSongByToken(String token) {
		return this.songDao.getSongByToken(token);
	}
	
	public boolean canAccessEditor(Song song, Integer loginUserId, Boolean isAdmin) {

	    if (Boolean.TRUE.equals(isAdmin)) {
	        return true;
	    }

	    // 에디터는 공개 여부와 무관하게 "작성자만" 허용
	    return loginUserId != null 
	           && song.getUserId() == loginUserId;
	}
}

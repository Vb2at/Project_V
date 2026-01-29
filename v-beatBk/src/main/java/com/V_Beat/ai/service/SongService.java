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
import com.V_Beat.report.dao.ReportActionDao;
import com.V_Beat.report.dao.ReportDao;
import com.V_Beat.report.dao.ReportSnapshotDao;

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
	
	//상태 상수
	private static final List<String> VISIBILITY_ALLOWED = List.of("PRIVATE", "UNLISTED");

	@Transactional(readOnly = true)
	public Song getSong(Long songId) {
		return songDao.getSong(songId);
	}

	@Transactional(readOnly = true)
	public SongNotesResult getSongNotes(Long songId) {
		List<NoteResult> notes = songDao.getSongNotes(songId);
		return new SongNotesResult(songId, notes);
	}

	@Transactional(readOnly = true)
	public List<Song> getPublicSongs() {
		return this.songDao.getPublicSongs();
	}

	public boolean canPlayWithLogout(Song song) {
		return song != null && "PUBLIC".equals(song.getVisibility());
	}

	@Transactional
	public void updateSongInfo(Long songId, int loginUserId, String title, String artist, String visibility,
			MultipartFile cover) {

		Song song = songDao.getSong(songId);
		if (song == null) {
			throw new RuntimeException("song not found");
		}

		if (song.getUserId() != loginUserId) {
			throw new RuntimeException("no permission");
		}
		
		if (!VISIBILITY_ALLOWED.contains(visibility)) {
			throw new IllegalArgumentException("invalid visibility");
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

		//제목 아티스트 커버만 수정
		if (coverPath != null) {
			songDao.updateSongWithCover(songId, title, artist, coverPath);
		} else {
			songDao.updateSong(songId, title, artist);
		}
		
		//공개범위 토큰 수정
		String shareToken = song.getShareToken();
		
		if ("UNLISTED".equals(visibility)) {
		    if (shareToken == null) {
		        shareToken = UUID.randomUUID().toString().replace("-", "");
		    }
		} else {
		    // PRIVATE
		    shareToken = null;
		}
		
		this.songDao.updateVisibilityAndToken(songId, visibility, shareToken);
	}

	@Transactional(readOnly = true)
	public List<Song> getPendingSongs(boolean isAdmin) {
		if (!isAdmin)
			throw new RuntimeException("admin only");
		return songDao.getPendingSongs();
	}

	@Transactional
	public void reviewSong(Long songId, String result, boolean isAdmin) {
		result = result.toUpperCase();

		if (!"PUBLIC".equals(result) && !"BLOCKED".equals(result)) {
			throw new RuntimeException("invalid result");
		}

		if (!isAdmin)
			throw new RuntimeException("admin only");

		Song song = songDao.getSong(songId);
		if (song == null)
			throw new RuntimeException("song not found");

		if (!"PENDING".equals(song.getVisibility())) {
			throw new RuntimeException("not pending");
		}

		songDao.updateVisibility(songId, result);
	}

	//본인 업록드 곡 조회
	@Transactional(readOnly = true)
	public List<MySong> getMySongs(int userId, String visibility) {
		if(visibility != null) {
			visibility = visibility.toUpperCase();
		}
		
		if(visibility == null || "ALL".equals(visibility)) {
			return this.songDao.findByUserId(userId);
		}
		
		return this.songDao.getMySongs(userId, visibility);
	}
	
	@Transactional
	public void replaceSongNotes(Long songId, List<NoteResult> notes) {

	    // 1. 기존 노트 전부 삭제
	    songDao.deleteSongNotes(songId);

	    // 2. 새 노트 전부 삽입
	    for (NoteResult n : notes) {
	        songDao.insertSongNote(
	            songId,
	            n.getLane(),
	            n.getType(),
	            n.getTime(),
	            n.getEndTime()
	        );
	    }
	}

	//파일 삭제 메서드
	private void deleteFile(String path) {
		if(path == null || path.isBlank()) {
			return;
		}
		
		try {
			Path filePath = Paths.get(path);
			Files.deleteIfExists(filePath);
		} catch(IOException e) {
			//파일 삭제 실패는 서비스 실패가 아님
			e.printStackTrace();
		}
	}
	
	//곡 삭제
	@Transactional
	public void deleteSong(long songId, long loginUserId) {
		//노래 조회
		Song song = this.songDao.getSong(songId);
		
		//노래 검증
		if(song == null) {
			throw new ResponseStatusException(NOT_FOUND);
		}
		
		//노래 업로드 유저 로그인 유저 같은지 검증
		if(song.getUserId() != loginUserId) {
			throw new ResponseStatusException(FORBIDDEN);
		}
		
		//해당 곡 관련 파일
		String audioPath = song.getFilePath();
		String previewPath = song.getPreviewPath();
		String coverPath = song.getCoverPath();

		//score 삭제
		this.scoreDao.deleteBySongId(songId);
		
		//note 삭제
		this.songDao.deleteSongNotes(songId);
		
		//report에 관련 기록 삭제
		this.reportDao.deleteBySongId(songId);
		
		//song 삭제
		this.songDao.deleteSong(songId);
		
		//해당 곡 관련 파일들 삭제
		deleteFile(audioPath);
		deleteFile(previewPath);
		deleteFile(coverPath);
	}
	
	//곡 제한 접근 제어
	public boolean canAccess(Song song, Integer loginUserId, Boolean isAdmin, String token) {
	    if (Boolean.TRUE.equals(isAdmin)) return true;  // 관리자 통과
	    if (loginUserId != null) return true;           // 로그인 유저 통과
	    if (token != null && token.equals(song.getShareToken())) return true; // 토큰 통과
	    if (song.getIsPublic()) return true;            // 공개곡 통과
	    return false;                                   // 나머지 차단
	}
	
	//토큰으로 곡 조회
	@Transactional(readOnly = true)
	public Song getSongByToken(String token) {
		if (token == null || token.isBlank()) {
			return null;
		}
		return this.songDao.getSongByToken(token);
	}
}

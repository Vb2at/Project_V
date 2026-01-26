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
	private ReportActionDao reportActionDao;
	private ReportSnapshotDao reportSnapshotDao;

	public SongService(SongDao songDao, ScoreDao scoreDao, ReportDao reportDao,
			ReportActionDao reportActionDao, ReportSnapshotDao reportSnapshotDao) {
		this.songDao = songDao;
		this.scoreDao = scoreDao;
		this.reportDao = reportDao;
		this.reportActionDao = reportActionDao;
		this.reportSnapshotDao = reportSnapshotDao;
	}

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

		List<String> allowed = List.of("PRIVATE", "UNLISTED");
		if (!allowed.contains(visibility)) {
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

		if (coverPath != null) {
			songDao.updateSongWithCover(songId, title, artist, visibility, coverPath);
		} else {
			songDao.updateSong(songId, title, artist, visibility);
		}
	}

	public boolean canAccess(Song song, Integer loginUserId, boolean isAdmin) {
		if (song == null)
			return false;

		String v = song.getVisibility();

		if ("PUBLIC".equals(v))
			return true;
		if ("UNLISTED".equals(v))
			return true;

		if ("PRIVATE".equals(v)) {
			return loginUserId != null && song.getUserId() == loginUserId;
		}

		if ("PENDING".equals(v)) {
			return isAdmin || (loginUserId != null && song.getUserId() == loginUserId);
		}

		if ("BLOCKED".equals(v)) {
			return isAdmin;
		}

		return false;
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
}

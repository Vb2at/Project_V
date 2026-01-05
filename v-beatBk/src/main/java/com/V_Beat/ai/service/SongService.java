package com.V_Beat.ai.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.V_Beat.ai.dao.SongDao;
import com.V_Beat.ai.dto.NoteResult;
import com.V_Beat.ai.dto.SongNotesResult;
import com.V_Beat.dto.Song;

@Service
public class SongService {
	
	private SongDao songDao;
	
	public SongService(SongDao songDao) {
		this.songDao = songDao;
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
		return song != null && song.isPublic();
	}
}

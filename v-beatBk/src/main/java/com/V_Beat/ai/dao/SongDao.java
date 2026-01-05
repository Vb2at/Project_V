package com.V_Beat.ai.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.ai.dto.NoteResult;
import com.V_Beat.dto.Song;

@Mapper
public interface SongDao {
	
	@Select("""
			SELECT id,
			title,
			artist,
			duration,
			diff,
			file_path AS filePath,
			cover_path AS coverPath,
			create_date AS createDate,
			is_public AS isPublic
			FROM song
			WHERE id = #{songId}
			""")
	Song getSong(Long songId);
	
	@Select("""
			SELECT note_time AS time, lane, `type`, end_time AS endTime
				FROM note
				WHERE song_id = #{songId}
				ORDER BY note_time ASC
			""")
	List<NoteResult> getSongNotes(Long songId);
	
	//비로그인 유저 플레이 리스트
	@Select("""
			SELECT id,
				   title,
				   artist,
				   duration,
				   diff,
				   file_path AS filePath,
				   cover_path AS coverPath,
				   create_date AS createDate,
				   is_public AS isPublic
				FROM song
				WHERE is_public = 1
				ORDER BY create_date DESC
			""")
	List<Song> getPublicSongs();
}

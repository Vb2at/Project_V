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
				userId AS userId,
				title,
				artist,
				duration,
				diff,
				file_path AS filePath,
				cover_path AS coverPath,
				create_date AS createDate,
				preview_path AS previewPath,
				visibility
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

	@Select("""
			    SELECT id,
			           userId AS userId,
			           title,
			           artist,
			           duration,
			           diff,
			           file_path AS filePath,
			           cover_path AS coverPath,
			           create_date AS createDate,
			           preview_path AS previewPath,
			           visibility
			    FROM song
			    WHERE visibility = 'PENDING'
			    ORDER BY create_date ASC
			""")
	List<Song> getPendingSongs();

	// 비로그인 유저 플레이 리스트
	@Select("""
			SELECT id,
			       userId AS userId,
			       title,
			       artist,
			       duration,
			       diff,
			       file_path AS filePath,
			       cover_path AS coverPath,
			       create_date AS createDate,
			       preview_path AS previewPath,
			       visibility
			FROM song
			WHERE visibility = 'PUBLIC'
			ORDER BY create_date DESC
						""")
	List<Song> getPublicSongs();

	@Update("""
			UPDATE song
			SET title = #{title},
				artist = #{artist},
				visibility = #{visibility},
				cover_path = #{coverPath}
			WHERE id = #{songId}
			""")
	void upadateSongWithCover(Long songId, String title, String artist, String visibility, String coverPath);

	@Update("""
			UPDATE song
			SET title = #{title},
				artist = #{artist},
				visibility = #{visibility}
			WHERE id = #{songId}
			""")
	void upDateSong(Long songId, String title, String artist, String visibility);

	@Update("""
			    UPDATE song
			    SET visibility = #{visibility}
			    WHERE id = #{songId}
			""")
	void updateVisibility(Long songId, String visibility);

	@Select("""
			    SELECT id,
			           userId AS userId,
			           title,
			           artist,
			           duration,
			           diff,
			           file_path AS filePath,
			           cover_path AS coverPath,
			           create_date AS createDate,
			           preview_path AS previewPath,
			           visibility
			    FROM song
			    WHERE userId = #{userId}
			    ORDER BY create_date DESC
			""")
	List<Song> getMySongs(int userId);

}

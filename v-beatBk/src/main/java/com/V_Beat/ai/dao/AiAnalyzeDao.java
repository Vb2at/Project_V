package com.V_Beat.ai.dao;

import java.util.List;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.ai.dto.NoteResult;
import com.V_Beat.dto.Note;
import com.V_Beat.dto.Song;

@Mapper
public interface AiAnalyzeDao {
	
	@Insert("""
			INSERT INTO song(title, artist, duration, diff, file_path, cover_path)
			VALUES (#{title}, #{artist}, #{duration}, #{diff}, #{filePath}, #{coverPath})
			""")
	@Options(useGeneratedKeys = true, keyProperty = "id")
	//DB에서 자동으로 생성된 PK를 INSERT 직후 id 필드에 다시 채워주는 옵션
	void insertSong(Song song);

	@Insert("""
			INSERT INTO note(song_id, `type`, end_time, note_time, lane)
			VALUES (#{songId}, #{type}, #{endTime}, #{noteTime}, #{lane})
			""")
	void insertNote(Note note);
	
	@Select("""
			SELECT note_time AS time, lane, `type`, end_time AS endTime
				FROM note
				WHERE song_id = #{songId}
				ORDER BY note_time ASC
			""")
	List<NoteResult> getSongNotes(Long songId);

	@Update("""
			UPDATE song
				SET file_path = #{filePath}
				WHERE id = #{id}
			""")
	void updateSongFilePath(Song song);
	
	@Select("""
		    SELECT id,
		           title,
		           artist,
		           duration,
		           diff,
		           file_path AS filePath,
		           cover_path AS coverPath,
		           create_date AS createDate
		      FROM song
		     WHERE id = #{songId}
		""")
	Song getSong(Long songId);
	
	@Update("""
		    UPDATE song
		       SET cover_path = #{coverPath}
		     WHERE id = #{id}
		""")
	void updateSongCoverPath(Song song);
	
}
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
			INSERT INTO song(title, file_path)
			VALUES (#{title}, #{filePath})
			""")
	@Options(useGeneratedKeys = true, keyProperty = "id")
	//DB에서 자동으로 생성된 PK를 INSERT 직후 id 필드에 다시 채워주는 옵션
	void insertSong(Song song);

	@Insert("""
			INSERT INTO note(song_id, note_time, lane)
			VALUES (#{songId}, #{noteTime}, #{lane})
			""")
	void insertNote(Note note);
	
	@Select("""
			SELECT note_time AS time, lane
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
			SELECT * 
				FROM song
				WHERE id = #{songId}
			""")
	Song getSong(Long songId);
	
}
package com.V_Beat.ai.dao;

import java.math.BigDecimal;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;

import com.V_Beat.ai.dto.MySong;
import com.V_Beat.ai.dto.NoteResult;
import com.V_Beat.dto.Song;

@Mapper
public interface SongDao {

	//플레이 리스트, 게임 플레이시 사용
	@Select("""
			SELECT id,
			       user_id     AS userId,
			       title,
			       artist,
			       duration,
			       diff,
			       file_path   AS filePath,
			       cover_path  AS coverPath,
			       create_date AS createDate,
			       preview_path AS previewPath,
			       visibility
			FROM song
			WHERE id = #{songId}
			""")
	Song getSong(Long songId);

	//노트 조회
	@Select("""
			SELECT note_time AS time,
			       lane,
			       `type`,
			       end_time AS endTime
			FROM note
			WHERE song_id = #{songId}
			ORDER BY note_time ASC
			""")
	List<NoteResult> getSongNotes(Long songId);

	@Select("""
			SELECT id,
			       user_id     AS userId,
			       title,
			       artist,
			       duration,
			       diff,
			       file_path   AS filePath,
			       cover_path  AS coverPath,
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
			       user_id     AS userId,
			       title,
			       artist,
			       duration,
			       diff,
			       file_path   AS filePath,
			       cover_path  AS coverPath,
			       create_date AS createDate,
			       preview_path AS previewPath,
			       visibility
			FROM song
			WHERE visibility = 'PUBLIC'
			ORDER BY create_date DESC
			""")
	List<Song> getPublicSongs();

	//노래 커버 업데이트
	@Update("""
			UPDATE song
			SET title = #{title},
			    artist = #{artist},
			    visibility = #{visibility},
			    cover_path = #{coverPath}
			WHERE id = #{songId}
			""")
	void updateSongWithCover(Long songId,
	                         String title,
	                         String artist,
	                         String visibility,
	                         String coverPath);

	//노래 수정
	@Update("""
			UPDATE song
			SET title = #{title},
			    artist = #{artist},
			    visibility = #{visibility}
			WHERE id = #{songId}
			""")
	void updateSong(Long songId,
	                String title,
	                String artist,
	                String visibility);

	//노래 상태 변경
	@Update("""
			UPDATE song
			SET visibility = #{visibility}
			WHERE id = #{songId}
			""")
	void updateVisibility(Long songId, String visibility);

	//본인 업로드 곡 조회
	@Select("""
			SELECT 
				id AS id,
			  	title AS title,
				visibility AS visibility,
				cover_path AS coverPath
			FROM song
			WHERE user_id = #{userId}
			AND visibility = #{visibility}
			ORDER BY create_date DESC
			""")
	List<MySong> getMySongs(int userId, String visibility);

	//유저 아이디로 업로드 곡 조회 (전체 목록)
	@Select("""
			SELECT 
				id AS id,
				title AS title,
				visibility AS visibility,
				cover_path AS coverPath
			FROM song
			WHERE user_id = #{userId}
			ORDER BY create_date DESC
			""")
	List<MySong> findByUserId(int userId);
	
	//노트 삭제
	@Delete("""
		    DELETE FROM note
		    WHERE song_id = #{songId}
		""")
		void deleteSongNotes(@Param("songId") Long songId);
	
	//노트 insert
	@Insert("""
		    INSERT INTO note (song_id, lane, type, note_time, end_time)
		    VALUES (#{songId}, #{lane}, #{type}, #{time}, #{endTime})
		""")
		void insertSongNote(
		    @Param("songId") Long songId,
		    @Param("lane") int lane,
		    @Param("type") String type,
		    @Param("time") BigDecimal time,
		    @Param("endTime") BigDecimal endTime
		);
}
package com.V_Beat.ai.dao;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import com.V_Beat.dto.Note;
import com.V_Beat.dto.Song;

@Mapper
public interface AiAnalyzeDao {

    @Insert("""
        INSERT INTO song(
            title, artist, duration, diff,
            file_path, cover_path,
            user_id, visibility
        )
        VALUES (
            #{title}, #{artist}, #{duration}, #{diff},
            #{filePath}, #{coverPath},
            #{userId}, #{visibility}
        )
    """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertSong(Song song);

    @Insert("""
        INSERT INTO note(song_id, `type`, end_time, note_time, lane)
        VALUES (#{songId}, #{type}, #{endTime}, #{noteTime}, #{lane})
    """)
    void insertNote(Note note);

    @Update("""
        UPDATE song
        SET file_path = #{filePath}
        WHERE id = #{id}
    """)
    void updateSongFilePath(Song song);

    @Update("""
        UPDATE song
        SET cover_path = #{coverPath}
        WHERE id = #{id}
    """)
    void updateSongCoverPath(Song song);

    @Update("""
        UPDATE song
        SET artist = #{artist},
            duration = #{duration}
        WHERE id = #{id}
    """)
    void updateSongMeta(Song s);

    @Update("""
        UPDATE song
        SET preview_path = #{previewPath}
        WHERE id = #{songId}
    """)
    void updatePreviewPath(
        @Param("songId") Long songId,
        @Param("previewPath") String previewPath
    );
}

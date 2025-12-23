package com.V_Beat.ai.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongNotesResult {
	private Long songId;
	private int noteCount;
	private List<NoteResult> notes;
	
	public SongNotesResult(Long songId, List<NoteResult> notes) {
		this.songId = songId;
		this.notes = notes;
		this.noteCount = (notes == null) ? 0 : notes.size();
	}
}
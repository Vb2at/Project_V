// src/engine/NoteCalculator.js
import { GAME_CONFIG } from '../constants/GameConfig';;

export class NoteCalculator {
  static judgeNote(laneIndex, currentTime, notes) {
    // 해당 레인의 노트 찾기
    const laneNotes = notes.filter(note => note.lane === laneIndex && !note.hit);
    
    // 가장 가까운 노트 찾기
    let closestNote = null;
    let minDiff = Infinity;
    
    for (const note of laneNotes) {
      const diff = Math.abs(note.timing - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = note;
      }
    }
    
    // 판정
    if (!closestNote) return null;
    
    if (minDiff <= GAME_CONFIG.JUDGEMENT.PERFECT) {
      return { note: closestNote, judgement: 'PERFECT', diff: minDiff };
    } else if (minDiff <= GAME_CONFIG.JUDGEMENT.GOOD) {
      return { note: closestNote, judgement: 'GOOD', diff: minDiff };
    } else if (minDiff <= GAME_CONFIG.JUDGEMENT.MISS) {
      return { note: closestNote, judgement: 'MISS', diff: minDiff };
    }
    
    return null;
  }
  // 롱노트 끝 판정
  static judgeNoteRelease(laneIndex, currentTime, notes) {
    const holdingNote = notes.find(
      note => note.lane === laneIndex && note.holding && !note.hit
    );
    
    if (!holdingNote || holdingNote.type !== 'long') return null;
    
    const diff = Math.abs(holdingNote.endTiming - currentTime);
    
    if (diff <= GAME_CONFIG.JUDGEMENT.PERFECT) {
      return { note: holdingNote, judgement: 'PERFECT', diff };
    } else if (diff <= GAME_CONFIG.JUDGEMENT.GOOD) {
      return { note: holdingNote, judgement: 'GOOD', diff };
    } else {
      return { note: holdingNote, judgement: 'MISS', diff };
    }
  }

}
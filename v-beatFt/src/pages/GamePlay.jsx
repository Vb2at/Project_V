// src/pages/GamePlay.jsx
import { useState, useEffect } from 'react';
import GameCanvas from '../components/Game/GameCanvas';
import { InputHandler } from '../engine/InputHandler';
import { NoteCalculator } from '../engine/NoteCalculator';
import { GAME_CONFIG } from '../constants/GameConfig';

export default function GamePlay() {
  const [notes, setNotes] = useState([
    { lane: 0, timing: 1000, type: 'tap', hit: false },
    { lane: 1, timing: 2000, endTiming: 3500, type: 'long', hit: false, holding: false }, // 롱노트
    { lane: 3, timing: 3000, type: 'tap', hit: false },
    { lane: 4, timing: 4000, endTiming: 5000, type: 'long', hit: false, holding: false }, // 롱노트
    { lane: 6, timing: 5500, type: 'tap', hit: false },
  ]);

  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 16);
    }, 16);
    
    return () => clearInterval(interval);
  }, []);

  // 롱노트 홀딩 보너스
  useEffect(() => {
    const interval = setInterval(() => {
      const holdingNotes = notes.filter(n => n.holding && !n.hit && currentTime <= n.endTime);
      if (holdingNotes.length > 0) {
        const bonus = holdingNotes.length * GAME_CONFIG.SCORE.LONG_BONUS;
        setScore(prev => prev + bonus);
      }
    }, 100); // 0.1초마다 보너스
    
    return () => clearInterval(interval);
  }, [notes, currentTime]);

  // 입력 처리
  useEffect(() => {
    const handleKeyPress = (laneIndex) => {
      const result = NoteCalculator.judgeNote(laneIndex, currentTime, notes);
      
      if (result) {
        console.log(`판정: ${result.judgement}, 시간차: ${result.diff}ms`);
        
        if (result.note.type === 'long') {
          // 롱노트 시작 - holding 상태로
          setNotes(prev => prev.map(note => 
            note === result.note ? { ...note, holding: true } : note
          ));
        } else {
          // 탭노트 - 즉시 hit 처리
          setNotes(prev => prev.map(note => 
            note === result.note ? { ...note, hit: true } : note
          ));
        }
        
        const addScore = GAME_CONFIG.SCORE[result.judgement];
        setScore(prev => prev + addScore);
        setCombo(prev => prev + 1);
        
        console.log(`점수: +${addScore} (총: ${score + addScore}), 콤보: ${combo + 1}`);
      }
    };

    const handleKeyRelease = (laneIndex) => {
      const result = NoteCalculator.judgeNoteRelease(laneIndex, currentTime, notes);
      
      if (result) {
        console.log(`롱노트 끝 판정: ${result.judgement}, 시간차: ${result.diff}ms`);
        
        // 롱노트 완료 - hit 처리
        setNotes(prev => prev.map(note => 
          note === result.note ? { ...note, hit: true, holding: false } : note
        ));
        
        const addScore = GAME_CONFIG.SCORE[result.judgement];
        setScore(prev => prev + addScore);
        
        console.log(`롱노트 완료! +${addScore}`);
      } else {
        // 잘못된 릴리즈 - holding 상태인 노트 찾아서 Miss 처리
        setNotes(prev => prev.map(note => {
          if (note.lane === laneIndex && note.holding) {
            console.log('롱노트 실패 (잘못된 타이밍에 뗌)');
            setCombo(0);
            return { ...note, hit: true, holding: false };
          }
          return note;
        }));
      }
    };

    const inputHandler = new InputHandler(handleKeyPress, handleKeyRelease);
    
    return () => inputHandler.destroy();
  }, [currentTime, notes, score, combo]);

  return (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', background: '#000', minHeight: '100vh'}}>
      <div style={{color: 'white', fontSize: '24px', marginBottom: '20px', display: 'flex', gap: '40px'}}>
        <div>점수: {score}</div>
        <div>콤보: {combo}</div>
      </div>
      <GameCanvas notes={notes.filter(n => !n.hit)} currentTime={currentTime} />
    </div>
  );
}
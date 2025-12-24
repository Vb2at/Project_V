// src/pages/GamePlay.jsx
import { useState, useEffect, useRef } from 'react';
import GameCanvas from '../components/Game/GameCanvas';
import { InputHandler } from '../engine/InputHandler';
import { NoteCalculator } from '../engine/NoteCalculator';
import { GAME_CONFIG } from '../constants/GameConfig';
import PixiEffects from '../components/Game/PixiEffects';
import { addTapEffect } from '../util/EffectsHelpers';

export default function GamePlay() {
  const [notes, setNotes] = useState([
    // 0-2초: 기본 탭노트
    { lane: 0, timing: 500, type: 'tap', hit: false },
    { lane: 1, timing: 700, type: 'tap', hit: false },
    { lane: 2, timing: 900, type: 'tap', hit: false },
    { lane: 3, timing: 1100, type: 'tap', hit: false },
    { lane: 4, timing: 1300, type: 'tap', hit: false },
    { lane: 5, timing: 1500, type: 'tap', hit: false },
    { lane: 6, timing: 1700, type: 'tap', hit: false },

    // 2-4초: 롱노트 + 탭노트 혼합
    { lane: 1, timing: 2000, endTime: 3000, type: 'long', hit: false, holding: false },
    { lane: 5, timing: 2000, endTime: 3000, type: 'long', hit: false, holding: false },
    { lane: 3, timing: 2500, type: 'tap', hit: false },
    { lane: 0, timing: 3200, type: 'tap', hit: false },
    { lane: 6, timing: 3400, type: 'tap', hit: false },

    // 4-6초: 연속 탭노트
    { lane: 0, timing: 4000, type: 'tap', hit: false },
    { lane: 1, timing: 4200, type: 'tap', hit: false },
    { lane: 2, timing: 4400, type: 'tap', hit: false },
    { lane: 3, timing: 4600, type: 'tap', hit: false },
    { lane: 4, timing: 4800, type: 'tap', hit: false },
    { lane: 5, timing: 5000, type: 'tap', hit: false },
    { lane: 6, timing: 5200, type: 'tap', hit: false },
    { lane: 3, timing: 5400, type: 'tap', hit: false },
    { lane: 1, timing: 5600, type: 'tap', hit: false },
    { lane: 5, timing: 5800, type: 'tap', hit: false },

    // 6-8초: 동시 롱노트
    { lane: 0, timing: 6000, endTime: 7500, type: 'long', hit: false, holding: false },
    { lane: 6, timing: 6000, endTime: 7500, type: 'long', hit: false, holding: false },
    { lane: 3, timing: 6500, type: 'tap', hit: false },
    { lane: 3, timing: 7000, type: 'tap', hit: false },

    // 8-10초: 마무리 패턴
    { lane: 2, timing: 8000, type: 'tap', hit: false },
    { lane: 4, timing: 8200, type: 'tap', hit: false },
    { lane: 1, timing: 8400, type: 'tap', hit: false },
    { lane: 5, timing: 8600, type: 'tap', hit: false },
    { lane: 3, timing: 8800, endTime: 9500, type: 'long', hit: false, holding: false },
    { lane: 0, timing: 9600, type: 'tap', hit: false },
    { lane: 6, timing: 9800, type: 'tap', hit: false },
    { lane: 3, timing: 10000, type: 'tap', hit: false },
  ]);

  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [effects, setEffects] = useState([]);

  // ✅ 최신 값 참조용 ref (InputHandler를 1회만 만들기 위해 필수)
  const notesRef = useRef(notes);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 16;
        currentTimeRef.current = newTime;

        setNotes(prevNotes =>
          prevNotes.map(note => {
            if (note.type === 'long' && note.holding && newTime > note.endTime) {
              setEffects(prevEffects =>
                prevEffects.filter(e => !(e.type === 'long' && e.lane === note.lane))
              );
              return { ...note, holding: false };
            }
            return note;
          })
        );

        return newTime;
      });
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Miss 자동 감지
  useEffect(() => {
    const interval = setInterval(() => {
      const now = currentTimeRef.current;

      setNotes(prev => {
        let missOccurred = false;

        const newNotes = prev.map(note => {
          if (note.hit) return note;

          if (note.type === 'long') {
            if (!note.holding && now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              return { ...note, hit: true, judgement: 'MISS' };
            }
            if (note.holding && now > note.endTime + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;

              // 롱노트 임펙트 제거
              setEffects(prevEffects =>
                prevEffects.filter(e => !(e.type === 'long' && e.lane === note.lane))
              );

              return { ...note, hit: true, holding: false, judgement: 'MISS' };
            }
          } else {
            if (now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              return { ...note, hit: true, judgement: 'MISS' };
            }
          }

          return note;
        });

        if (missOccurred) setCombo(0);

        return missOccurred ? newNotes : prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // 롱노트 홀딩 보너스
  useEffect(() => {
    const interval = setInterval(() => {
      const holdingNotes = notesRef.current.filter(n => n.holding && !n.hit);
      if (holdingNotes.length > 0) {
        const bonus = holdingNotes.length * GAME_CONFIG.SCORE.LONG_BONUS;
        setScore(prev => prev + bonus);
        setCombo(prev => prev + 1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // ✅ 입력 처리 (반드시 1회만 등록)
  useEffect(() => {
    const handleKeyPress = laneIndex => {
      setPressedKeys(prev => new Set(prev).add(laneIndex));

      // ✅ 최신 값은 ref에서 읽기
      const result = NoteCalculator.judgeNote(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );

      if (!result) return;

      if (result.note.type === 'long') {
        setNotes(prev =>
          prev.map(note => (note === result.note ? { ...note, holding: true } : note))
        );

        // ✅ 롱노트 임펙트 추가 (id 포함)
        setEffects(prev => [
          ...prev,
          {
            type: 'long',
            lane: laneIndex,
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          },
        ]);
      } else {
        setNotes(prev =>
          prev.map(note => (note === result.note ? { ...note, hit: true } : note))
        );

        // ✅ 탭노트 임펙트 추가 (유니크 id 보장)
        addTapEffect(setEffects, laneIndex);
      }

      const addScore = GAME_CONFIG.SCORE[result.judgement];
      setScore(prev => prev + addScore);
      setCombo(prev => prev + 1);
    };

    const handleKeyRelease = laneIndex => {
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(laneIndex);
        return newSet;
      });

      // ✅ 최신 값은 ref에서 읽기
      const result = NoteCalculator.judgeNoteRelease(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );

      if (result) {
        setNotes(prev =>
          prev.map(note =>
            note === result.note ? { ...note, hit: true, holding: false } : note
          )
        );

        // 롱노트 임펙트 제거
        setEffects(prev => prev.filter(e => !(e.type === 'long' && e.lane === laneIndex)));

        const addScore = GAME_CONFIG.SCORE[result.judgement];
        setScore(prev => prev + addScore);
      } else {
        setNotes(prev =>
          prev.map(note => {
            if (note.lane === laneIndex && note.holding) {
              setCombo(0);

              // 롱노트 임펙트 제거
              setEffects(prevEffects =>
                prevEffects.filter(e => !(e.type === 'long' && e.lane === laneIndex))
              );

              return { ...note, holding: false, released: true };
            }
            return note;
          })
        );
      }
    };

    const inputHandler = new InputHandler(handleKeyPress, handleKeyRelease);
    return () => inputHandler.destroy();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#000',
        minHeight: '100vh',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          color: 'white',
          fontSize: '24px',
          marginBottom: '20px',
          display: 'flex',
          gap: '40px',
        }}
      >
        <div>점수: {score}</div>
        <div>콤보: {combo}</div>
      </div>

      <div
        style={{
          position: 'relative',
          width: GAME_CONFIG.CANVAS.WIDTH + 'px',
          height: GAME_CONFIG.CANVAS.HEIGHT + 'px',
        }}
      >
        <GameCanvas
          notes={notes.filter(n => {
            if (!n.hit) return true;

            // 롱노트는 released여도 endTime까지 표시
            if (n.type === 'long') {
              const timeToDisappear = (GAME_CONFIG.CANVAS.HEIGHT + 100) / GAME_CONFIG.SPEED;
              return currentTime < n.endTime + timeToDisappear;
            }

            return false;
          })}
          currentTime={currentTime}
          pressedKeys={pressedKeys}
        />

        <PixiEffects effects={effects} />
      </div>
    </div>
  );
}
